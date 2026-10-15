import { test, before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { installFakeAdb, captured, AERIAL } from './helpers/fake-adb.js';
import { drive, DOWN, ENTER } from './helpers/drive.js';
import { launcherFetch, useDroppingAdb } from './helpers/launcher-fakes.js';
import { LTV, HOME_REDIRECT } from '../src/launcher-registry.js';
import { ltvBackupNames, pullLtvBackup, LTV_BACKUP_DIR } from '../src/apply/ltv.js';
import { manageLtvNotifications } from '../src/steps/ltv-notifications.js';
import { manageLtvBackup } from '../src/steps/ltv-backup.js';
import { manageLauncher } from '../src/steps/launcher.js';
import { uninstallEverything } from '../src/steps/uninstall.js';

const ip = '192.168.1.49';
const LISTENERS = 'enabled_notification_listeners';
const CONTINUE = { expect: 'Nothing has been changed yet. Continue?', send: ENTER };
const BACKUP = JSON.stringify({ version: 1, settings: {}, apps: [], categories: [], appsCategories: [], spacers: [] });

let fake;
let undoAdb;
let realFetch;
let scratch;

before(() => {
  fake = installFakeAdb();
  undoAdb = useDroppingAdb(fake);
  realFetch = globalThis.fetch;
  globalThis.fetch = launcherFetch();
});

beforeEach(() => {
  fake.reset();
  process.exitCode = undefined;
  scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'firetv-ltv-test-'));
});

after(() => {
  globalThis.fetch = realFetch;
  undoAdb();
  fake.restore();
  process.exitCode = undefined;
});

function installedEnv() {
  fs.writeFileSync(fake.envFile, `FIRE_TV_IP=${ip}\nINSTALLED=true\n`);
}

const ltvInstalled = (extra = {}) => fake.setState({ installed: [AERIAL, LTV.pkg, HOME_REDIRECT.pkg], ...extra });
const listeners = () => fake.readState().secure[LISTENERS];
const backupsOnTv = (files) => fake.setState({ files: Object.fromEntries(Object.entries(files).map(([n, body]) => [`${LTV_BACKUP_DIR}/${n}`, body])) });

test('firetv-ltv-notifications --yes allows LTvLauncher to read notifications, and --off takes it back', async () => {
  ltvInstalled();
  fake.setState({ secure: { ...fake.readState().secure, [LISTENERS]: 'other/listener' } });
  const on = await captured(() => manageLtvNotifications(ip, { yes: true }));
  assert.match(on.out, /LTvLauncher can now read notifications/);
  assert.equal(listeners(), `other/listener:${LTV.notificationListener}`);

  const off = await captured(() => manageLtvNotifications(ip, { off: true }));
  assert.match(off.out, /notification access is off/);
  assert.equal(listeners(), 'other/listener');
  assert.notEqual(process.exitCode, 1);
});

test('firetv-ltv-notifications refuses without LTvLauncher, and reports a TV that keeps its old list', async () => {
  const missing = await captured(() => manageLtvNotifications(ip, { yes: true }));
  assert.match(missing.out, /LTvLauncher is not installed/);
  assert.equal(listeners(), undefined);
  assert.equal(process.exitCode, 1);

  process.exitCode = undefined;
  ltvInstalled({ listenerIgnored: true });
  const ignored = await captured(() => manageLtvNotifications(ip, { yes: true }));
  assert.match(ignored.out, /did not save LTvLauncher's notification access/);
  assert.equal(process.exitCode, 1);
});

test('the firetv-ltv-notifications menu offers whichever change applies and makes it', async () => {
  installedEnv();
  ltvInstalled();
  const on = await drive('bin/firetv-ltv-notifications.js', [], [
    { expect: 'What would you like to do?', send: ENTER },
    CONTINUE,
  ]);
  assert.equal(on.code, 0, on.out);
  assert.match(on.out, /cannot read notifications/);
  assert.equal(listeners(), LTV.notificationListener);

  const off = await drive('bin/firetv-ltv-notifications.js', [], [
    { expect: 'What would you like to do?', send: ENTER },
    CONTINUE,
  ]);
  assert.match(off.out, /Turn off LTvLauncher notification access/);
  assert.equal(listeners(), undefined, off.out);
});

test('launcher --install-ltv allows LTvLauncher notification access once it is installed', async () => {
  const pinned = LTV.sha256;
  LTV.sha256 = crypto.createHash('sha256').update(`pkg:${LTV.pkg}`).digest('hex');
  try {
    const { out } = await captured(() => manageLauncher(ip, { 'install-ltv': true }));
    assert.match(out, /LTvLauncher installed/);
    assert.match(out, /LTvLauncher can now read notifications/);
  } finally {
    LTV.sha256 = pinned;
  }
  assert.equal(listeners(), LTV.notificationListener);
});

test('launcher --install-ltv leaves notification access alone when LTvLauncher fails its checksum', async () => {
  await captured(() => manageLauncher(ip, { 'install-ltv': true }));
  assert.equal(listeners(), undefined);
  assert.equal(process.exitCode, 1);
});

test('the launcher menu offers notification access while LTvLauncher has none', async () => {
  installedEnv();
  ltvInstalled({ versions: { [HOME_REDIRECT.pkg]: '1.2.5' } });
  const r = await drive('bin/firetv-launcher.js', [], [
    { expect: 'Allow LTvLauncher to read notifications', send: `${DOWN.repeat(4)}${ENTER}` },
    CONTINUE,
  ]);
  assert.equal(r.code, 0, r.out);
  assert.equal(listeners(), LTV.notificationListener);
});

test('firetv-revert turns LTvLauncher notification access off, ticked by default', async () => {
  ltvInstalled();
  fake.setState({ secure: { ...fake.readState().secure, [LISTENERS]: LTV.notificationListener } });
  const { result, out } = await captured(() => uninstallEverything(ip, { all: true, force: true }));
  assert.equal(result, 'reverted', out);
  assert.match(out, /notification access is off/);
  assert.equal(listeners(), undefined);
  assert.ok(fake.readState().installed.includes(LTV.pkg), 'LTvLauncher itself stays unless ticked');
});

test('ltvBackupNames keeps LTvLauncher exports only, newest first', () => {
  assert.deepEqual(
    ltvBackupNames(['ltv_backup_20261015_120105.json', 'other-backup.txt', 'ltv_backup.json', 'ltv_backup_20261016_080000.json', 'ltv_backup_20261015_120107.json']),
    ['ltv_backup_20261016_080000.json', 'ltv_backup_20261015_120107.json', 'ltv_backup_20261015_120105.json'],
  );
});

test('pullLtvBackup never writes over a file that appears before it saves', async () => {
  backupsOnTv({ 'ltv_backup_20261016_080000.json': BACKUP });
  const destination = path.join(scratch, 'taken.json');
  fs.writeFileSync(destination, 'keep me');
  await assert.rejects(pullLtvBackup(ip, 'ltv_backup_20261016_080000.json', destination), { code: 'EEXIST' });
  assert.equal(fs.readFileSync(destination, 'utf8'), 'keep me');
});

test('firetv-ltv-backup --pull saves the newest backup and checks it came through', async () => {
  ltvInstalled();
  backupsOnTv({ 'ltv_backup_20261015_120105.json': '{"version": 1, "old": true}', 'ltv_backup_20261016_080000.json': BACKUP });
  const destination = path.join(scratch, 'saved.json');
  const { out } = await captured(() => manageLtvBackup(ip, { pull: destination }));
  assert.match(out, /Backup saved/);
  assert.equal(fs.readFileSync(destination, 'utf8'), BACKUP);
  assert.notEqual(process.exitCode, 1);
});

test('firetv-ltv-backup --pull never overwrites a file, and removes a transfer that is not a backup', async () => {
  ltvInstalled();
  backupsOnTv({ 'ltv_backup_20261016_080000.json': BACKUP });
  const existing = path.join(scratch, 'existing.json');
  fs.writeFileSync(existing, 'keep me');
  const refused = await captured(() => manageLtvBackup(ip, { pull: existing }));
  assert.match(refused.out, /already exists/);
  assert.equal(fs.readFileSync(existing, 'utf8'), 'keep me');
  assert.equal(process.exitCode, 1);

  process.exitCode = undefined;
  fake.setState({ transferMismatch: true });
  const corrupt = path.join(scratch, 'corrupt.json');
  const broken = await captured(() => manageLtvBackup(ip, { pull: corrupt }));
  assert.match(broken.out, /did not come through as an LTvLauncher backup/);
  assert.equal(fs.existsSync(corrupt), false);
  assert.equal(process.exitCode, 1);

  process.exitCode = undefined;
  fake.setState({ transferMismatch: false });
  backupsOnTv({ 'ltv_backup_20261016_080000.json': '{"version": 2}' });
  const unknown = path.join(scratch, 'unknown.json');
  const wrongVersion = await captured(() => manageLtvBackup(ip, { pull: unknown }));
  assert.match(wrongVersion.out, /did not come through as an LTvLauncher backup/);
  assert.equal(fs.existsSync(unknown), false);
  assert.equal(process.exitCode, 1);
});

test('the firetv-ltv-backup menu can go back a step, and saves to the current folder', async () => {
  installedEnv();
  ltvInstalled();
  backupsOnTv({ 'ltv_backup_20261016_080000.json': BACKUP });
  const r = await drive('bin/firetv-ltv-backup.js', [], [
    { expect: 'Which backup?', send: ENTER },
    { expect: 'Where should it go?', send: ENTER },
    { expect: 'Which backup?', send: ENTER },
    { expect: 'Where should it go?', send: `${DOWN}${ENTER}` },
    CONTINUE,
  ], { cwd: scratch });
  assert.equal(r.code, 0, r.out);
  assert.equal(fs.readFileSync(path.join(scratch, 'ltv_backup_20261016_080000.json'), 'utf8'), BACKUP);
});

test('firetv-ltv-backup --pull needs a filename in a folder that exists', async () => {
  ltvInstalled();
  backupsOnTv({ 'ltv_backup_20261016_080000.json': BACKUP });
  const empty = await captured(() => manageLtvBackup(ip, { pull: ' ' }));
  assert.match(empty.out, /Enter a filename/);
  assert.equal(process.exitCode, 1);

  process.exitCode = undefined;
  const nowhere = path.join(scratch, 'missing-folder', 'saved.json');
  const missing = await captured(() => manageLtvBackup(ip, { pull: nowhere }));
  assert.match(missing.out, /Choose a folder that already exists/);
  assert.equal(fs.existsSync(path.dirname(nowhere)), false);
  assert.equal(process.exitCode, 1);
});

test('firetv-ltv-backup says how to export when the TV has no backup, and refuses without LTvLauncher', async () => {
  const missing = await captured(() => manageLtvBackup(ip, { pull: path.join(scratch, 'x.json') }));
  assert.match(missing.out, /LTvLauncher is not installed/);
  assert.equal(process.exitCode, 1);

  process.exitCode = undefined;
  ltvInstalled();
  const none = await captured(() => manageLtvBackup(ip, { pull: path.join(scratch, 'x.json') }));
  assert.match(none.out, /Export Backup first/);
  assert.equal(fs.existsSync(path.join(scratch, 'x.json')), false);
  assert.equal(process.exitCode, 1);
});

test('the firetv-ltv-backup menu copies the chosen backup to a file you name', async () => {
  installedEnv();
  ltvInstalled();
  const older = JSON.stringify({ version: 1, settings: { older: true } });
  backupsOnTv({ 'ltv_backup_20261016_080000.json': BACKUP, 'ltv_backup_20261015_120105.json': older });
  const destination = path.join(scratch, 'picked.json');
  const r = await drive('bin/firetv-ltv-backup.js', [], [
    { expect: 'Which backup?', send: `${DOWN}${ENTER}` },
    { expect: 'Where should it go?', send: `${DOWN}${DOWN}${ENTER}` },
    { expect: 'Save the backup on this computer as:', send: `${destination}${ENTER}` },
    CONTINUE,
  ]);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /ltv_backup_20261016_080000\.json \(newest\)/);
  assert.equal(fs.readFileSync(destination, 'utf8'), older);
});
