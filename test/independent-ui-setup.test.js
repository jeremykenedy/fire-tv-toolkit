import { test, before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { manifest } from './helpers/apk-fixture.js';
import { installFakeAdb, captured } from './helpers/fake-adb.js';
import { drive, DOWN, ENTER } from './helpers/drive.js';
import { inspectIndependentUiContract, preflightIndependentUi } from '../src/independent-ui-setup.js';
import { manageLauncher } from '../src/steps/launcher.js';
import { FIRE_TV_UI as UI, HOME_REDIRECT, LTV } from '../src/launcher-registry.js';
import { getSavedIp, isValidIp } from '../src/device-config.js';
import { createTvProfiles } from '../desktop/tv-profiles.js';

let fake;
const ip = '192.0.2.4';
before(() => { fake = installFakeAdb(); });
beforeEach(() => {
  fake.reset();
  process.exitCode = undefined;
  fake.setState({ installed: [UI.pkg, HOME_REDIRECT.pkg, LTV.pkg], versionCodes: { [UI.pkg]: 78 },
    properties: { 'ro.serialno': 'test-tv-serial', 'ro.product.model': 'Test TV', 'ro.build.version.sdk': '30' },
    features: ['android.software.leanback'], guard: { home: LTV.id },
    secure: { ...fake.readState().secure, enabled_accessibility_services: HOME_REDIRECT.service, accessibility_enabled: '1' } });
  fs.writeFileSync(fake.envFile, `FIRE_TV_IP=${ip}\nINSTALLED=true\nOWNER_CHOICE=keep\n`);
});
after(() => { fake.restore(); process.exitCode = undefined; });

function writeContract(overrides = {}, apkPackage = UI.pkg, sdk = { minSdk: 27, targetSdk: 36 }) {
  const name = Buffer.from('AndroidManifest.xml');
  const body = manifest({ pkg: apkPackage, version: 79, ...sdk });
  const local = Buffer.alloc(30 + name.length);
  local.writeUInt32LE(0x04034b50); local.writeUInt32LE(body.length, 18);
  local.writeUInt32LE(body.length, 22); local.writeUInt16LE(name.length, 26); name.copy(local, 30);
  const central = Buffer.alloc(46 + name.length);
  central.writeUInt32LE(0x02014b50); central.writeUInt32LE(body.length, 20);
  central.writeUInt32LE(body.length, 24); central.writeUInt16LE(name.length, 28); name.copy(central, 46);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50); end.writeUInt16LE(1, 8); end.writeUInt16LE(1, 10);
  end.writeUInt32LE(central.length, 12); end.writeUInt32LE(local.length + body.length, 16);
  const apk = Buffer.concat([local, body, central, end]);
  fs.writeFileSync(path.join(fake.dir, 'source.apk'), apk);
  const contract = { schemaVersion: 1, kind: 'fire-tv-ui-source-release', provenance: 'maintained-source',
    package: UI.pkg, sourceCommit: 'a'.repeat(40), releaseTag: 'v2.0.0', versionCode: 79, minSdk: 27,
    bytes: apk.length, sha256: createHash('sha256').update(apk).digest('hex'), signerSha256: UI.signerSha256,
    apkPath: 'source.apk', ...overrides };
  const file = path.join(fake.dir, 'source-release.json');
  fs.writeFileSync(file, JSON.stringify(contract));
  return file;
}

test('preflight uses the saved TV and keeps alternative Home, profiles and private settings intact', async () => {
  const before = fake.readState();
  const env = fs.readFileSync(fake.envFile, 'utf8');
  const plan = await preflightIndependentUi(getSavedIp());
  assert.equal(plan.target.ip, ip);
  assert.equal(plan.target.serial, 'test-tv-serial');
  assert.equal(plan.target.sdk, 30);
  assert.equal(plan.target.television, true);
  assert.equal(plan.currentHome, LTV.id);
  assert.equal(plan.installationAllowed, false);
  assert.equal(plan.artifact, null);
  assert.ok(plan.blockers.some(message => message.includes('release contract')));
  assert.ok(plan.recovery.some(message => message.includes('--use=amazon')));
  assert.deepEqual(fake.readState(), before);
  assert.equal(fs.readFileSync(fake.envFile, 'utf8'), env);
});

test('candidate verification checks actual bytes and manifest but never promotes declarations to release approval', async () => {
  const before = fake.readState();
  const plan = await preflightIndependentUi(ip, writeContract());
  assert.equal(plan.artifact.versionCode, 79);
  assert.equal(plan.artifact.signatureVerified, false);
  assert.equal(plan.artifact.publishedReleaseVerified, false);
  assert.equal(plan.installationAllowed, false);
  assert.deepEqual(fake.readState(), before);
  for (const overrides of [{ signerSha256: 'b'.repeat(64) }, { releaseTag: 'v2.0.0-preview' },
    { package: `${UI.pkg}.preview` }, { bytes: 250 * 1048576 + 1 }, { sourceCommit: 'unknown' }])
    assert.throws(() => inspectIndependentUiContract(writeContract(overrides)), /contract/);
  assert.throws(() => inspectIndependentUiContract(writeContract({ sha256: 'c'.repeat(64) })), /checksum/);
  assert.throws(() => inspectIndependentUiContract(writeContract({}, `${UI.pkg}.preview`)), /package or version/);
  assert.throws(() => inspectIndependentUiContract(writeContract({ versionCode: 80 })), /package or version/);
});

test('unsupported capabilities and non-increasing versions produce blockers without installing', async () => {
  const contract = writeContract();
  fake.setState({ properties: { 'ro.serialno': 'unknown', 'ro.build.version.sdk': '26' }, features: [], versionCodes: { [UI.pkg]: 79 } });
  const before = fake.readState();
  const plan = await preflightIndependentUi(ip, contract);
  assert.ok(plan.blockers.some(message => message.includes('identity')));
  assert.ok(plan.blockers.some(message => message.includes('API level')));
  assert.ok(plan.blockers.some(message => message.includes('Leanback')));
  assert.ok(plan.blockers.some(message => message.includes('higher version')));
  assert.deepEqual(fake.readState(), before);
});

test('preflight flags reject mixed mutations and report malformed contracts before device writes', async () => {
  const before = fake.readState();
  for (const flags of [{ 'source-ui': true, use: UI.id }, { 'source-ui': true, 'install-ui': true },
    { 'artifact-contract': 'missing.json' }, { 'artifact-contract': '' }]) {
    const result = await captured(() => manageLauncher(ip, flags));
    assert.match(result.out, /separate actions/);
    assert.equal(process.exitCode, 1);
  }
  const bad = path.join(fake.dir, 'bad.json');
  fs.writeFileSync(bad, '{');
  const result = await captured(() => manageLauncher(ip, { 'source-ui': true, 'artifact-contract': bad }));
  assert.match(result.out, /preflight stopped/);
  assert.deepEqual(fake.readState(), before);
});

test('CLI source setup route works from the saved TV and prints staged recovery without mutation', async () => {
  const before = fake.readState();
  const result = await drive('bin/firetv-launcher.js', ['--source-ui'], []);
  assert.equal(result.code, 0, result.out);
  assert.match(result.out, /Current Home: LTvLauncher/);
  assert.match(result.out, /No APK was installed/);
  assert.match(result.out, /--use=amazon/);
  assert.deepEqual(fake.readState(), before);
});

test('guided menu reaches the source setup preflight and keeps its saved launcher choice', async () => {
  const before = fake.readState();
  const result = await drive('bin/firetv-launcher.js', [], [
    { expect: 'What would you like to do?', send: `${DOWN.repeat(6)}${ENTER}` },
    { expect: 'Nothing has been changed yet. Continue?', send: ENTER },
  ]);
  assert.equal(result.code, 0, result.out);
  assert.match(result.out, /Independent Fire TV UI setup: preflight only/);
  assert.deepEqual(fake.readState(), before);
});


test('source setup accepts the existing selected named profile without changing any profile', async () => {
  const directory = path.join(fake.dir, 'named-profiles');
  fs.mkdirSync(directory);
  const profiles = createTvProfiles(directory, isValidIp);
  profiles.save({ name: 'Living room', ip });
  const selected = profiles.snapshot().activeProfileId;
  profiles.save({ name: 'Bedroom', ip: '192.0.2.5' });
  profiles.select(selected);
  const file = path.join(directory, 'tv-profiles.json');
  const before = fs.readFileSync(file, 'utf8');
  const snapshot = profiles.snapshot();
  const plan = await preflightIndependentUi(snapshot.savedIp);
  assert.equal(plan.target.ip, ip);
  assert.equal(plan.currentHome, LTV.id);
  assert.deepEqual(profiles.snapshot(), snapshot);
  assert.equal(fs.readFileSync(file, 'utf8'), before);
});

test('source contract checks actual compiled minimum SDK before any TV diagnostics', async () => {
  const before = fake.readState();
  assert.throws(() => inspectIndependentUiContract(writeContract({}, UI.pkg, { minSdk: 35, targetSdk: 36 })), /minimum SDK/);
  fake.setState({ offline: true });
  await assert.rejects(preflightIndependentUi(ip, writeContract({}, UI.pkg, { minSdk: 35 })), /minimum SDK/);
  fake.setState({ offline: before.offline });
  assert.throws(() => inspectIndependentUiContract(writeContract({}, UI.pkg, {})), /minimum SDK/);
  assert.throws(() => inspectIndependentUiContract(writeContract({}, UI.pkg, { minSdk: 27, sdkNamespace: 'urn:other' })), /minimum SDK/);
  const contract = writeContract({ minSdk: 35 }, UI.pkg, { minSdk: 35, targetSdk: 36 });
  const inspected = inspectIndependentUiContract(contract);
  assert.equal(inspected.minSdk, 35);
  assert.equal(inspected.targetSdk, 36);
  assert.equal(inspected.signatureVerified, false);
  const plan = await preflightIndependentUi(ip, contract);
  assert.ok(plan.blockers.some(message => message.includes('supported Android API level')));
  assert.equal(plan.installationAllowed, false);
  assert.deepEqual(fake.readState(), before);
});
