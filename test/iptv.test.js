import { test, before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { installFakeAdb, captured, AERIAL } from './helpers/fake-adb.js';
import { drive, DOWN, ENTER } from './helpers/drive.js';
import { launcherFetch } from './helpers/launcher-fakes.js';
import { OWNTV, IPTV_PLAYLIST } from '../src/iptv-registry.js';
import { manageIptv } from '../src/steps/iptv.js';
import { uninstallEverything } from '../src/steps/uninstall.js';

const ip = '192.168.1.49';
const FETCH_PRELOAD = path.join(path.dirname(fileURLToPath(import.meta.url)), 'helpers', 'launcher-fetch-preload.js');
const withFetchStub = { env: { NODE_OPTIONS: `${process.env.NODE_OPTIONS || ''} --import=${FETCH_PRELOAD}`.trim() } };
const CONTINUE = { expect: 'Nothing has been changed yet. Continue?', send: ENTER };

let fake;
let realFetch;

before(() => {
  fake = installFakeAdb();
  realFetch = globalThis.fetch;
  globalThis.fetch = launcherFetch();
});

beforeEach(() => {
  fake.reset();
  process.exitCode = undefined;
});

after(() => {
  globalThis.fetch = realFetch;
  fake.restore();
  process.exitCode = undefined;
});

function installedEnv() {
  fs.writeFileSync(fake.envFile, `FIRE_TV_IP=${ip}\nINSTALLED=true\n`);
}

const ownTvInstalled = (extra = {}) => fake.setState({ installed: [AERIAL, OWNTV.pkg], ...extra });

/** Runs fn with OwnTV pinned to the fake download's hash, which the real pin never matches. */
async function withFakeDownloadPinned(fn) {
  const pinned = OWNTV.sha256;
  OWNTV.sha256 = crypto.createHash('sha256').update(`pkg:${OWNTV.pkg}`).digest('hex');
  try {
    return await fn();
  } finally {
    OWNTV.sha256 = pinned;
  }
}

test('--install installs OwnTV, opens it, and shows the US playlist and how to add it', async () => {
  const { out } = await withFakeDownloadPinned(() => captured(() => manageIptv(ip, { install: true })));
  const s = fake.readState();
  assert.ok(s.installed.includes(OWNTV.pkg));
  assert.equal(s.opened, OWNTV.pkg);
  assert.match(out, /OwnTV installed/);
  assert.ok(out.includes(IPTV_PLAYLIST), out);
  assert.match(out, /choose Remote/);
  assert.match(out, /enter the PIN from the TV/);
  assert.match(out, /Choose M3U \/ M3U8/);
  assert.match(out, /Start Import on the TV/);
  assert.notEqual(process.exitCode, 1);
});

test('--install refuses a download that does not match OwnTV\'s pinned checksum', async () => {
  const { out } = await captured(() => manageIptv(ip, { install: true }));
  assert.match(out, /OwnTV: .*Checksum mismatch/);
  assert.ok(!out.includes(IPTV_PLAYLIST));
  const s = fake.readState();
  assert.ok(!s.installed.includes(OWNTV.pkg));
  assert.equal(s.opened, undefined);
  assert.equal(process.exitCode, 1);
});

test('--install still shows the playlist when the TV does not open OwnTV', async () => {
  fake.setState({ unopenable: [OWNTV.pkg] });
  const { out } = await withFakeDownloadPinned(() => captured(() => manageIptv(ip, { install: true })));
  assert.match(out, /The TV did not open OwnTV/);
  assert.ok(out.includes(IPTV_PLAYLIST));
  assert.ok(fake.readState().installed.includes(OWNTV.pkg));
  assert.notEqual(process.exitCode, 1);
});

test('--uninstall removes OwnTV, and only says so when it is not installed', async () => {
  const absent = await captured(() => manageIptv(ip, { uninstall: true }));
  assert.match(absent.out, /OwnTV is not installed/);
  assert.notEqual(process.exitCode, 1);

  ownTvInstalled();
  const removed = await captured(() => manageIptv(ip, { uninstall: true }));
  assert.match(removed.out, /OwnTV and its playlists were removed/);
  assert.deepEqual(fake.readState().installed, [AERIAL]);
  assert.notEqual(process.exitCode, 1);
});

test('--uninstall fails when the TV keeps OwnTV', async () => {
  ownTvInstalled({ stuck: true });
  const { out } = await captured(() => manageIptv(ip, { uninstall: true }));
  assert.match(out, /OwnTV could not be removed/);
  assert.ok(fake.readState().installed.includes(OWNTV.pkg));
  assert.equal(process.exitCode, 1);
});

test('--install with --uninstall, or --yes alone, changes nothing and fails', async () => {
  ownTvInstalled();
  const both = await captured(() => manageIptv(ip, { install: true, uninstall: true }));
  assert.match(both.out, /Choose either --install or --uninstall/);
  assert.equal(process.exitCode, 1);

  process.exitCode = undefined;
  const yes = await captured(() => manageIptv(ip, { yes: true }));
  assert.match(yes.out, /--yes alone does not pick anything/);
  assert.equal(process.exitCode, 1);
  assert.deepEqual(fake.readState().installed, [AERIAL, OWNTV.pkg]);
});

test('firetv-iptv menu offers only the install until OwnTV is on the TV', async () => {
  installedEnv();
  const r = await drive('bin/firetv-iptv.js', [], [
    { expect: 'What would you like to do?', send: ENTER },
    CONTINUE,
  ], withFetchStub);
  assert.match(r.out, /Install OwnTV and show the playlist to add/);
  assert.doesNotMatch(r.out, /Remove OwnTV/);
  assert.match(r.out, /OwnTV: .*Checksum mismatch/);
  assert.equal(r.code, 1, r.out);
});

test('firetv-iptv menu removes an installed OwnTV', async () => {
  installedEnv();
  ownTvInstalled();
  const r = await drive('bin/firetv-iptv.js', [], [
    { expect: 'What would you like to do?', send: `${DOWN}${ENTER}` },
    CONTINUE,
  ], withFetchStub);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /Update OwnTV and show the playlist to add/);
  assert.match(r.out, /OwnTV and its playlists were removed/);
  assert.deepEqual(fake.readState().installed, [AERIAL]);
});

test('firetv-revert --all leaves OwnTV and its playlists installed', async () => {
  ownTvInstalled();
  const { result, out } = await captured(() => uninstallEverything(ip, { all: true, force: true }));
  assert.equal(result, 'reverted', out);
  assert.ok(fake.readState().installed.includes(OWNTV.pkg));
});

test('firetv-revert removes OwnTV when it is ticked by hand, and reports one the TV keeps', async () => {
  installedEnv();
  ownTvInstalled();
  const tickOnlyOwnTv = [
    { expect: 'What should be reverted?', send: `i${ENTER}` },
    CONTINUE,
    { expect: 'Type "yes"', send: `yes${ENTER}` },
  ];
  const removed = await drive('bin/firetv-revert.js', [], tickOnlyOwnTv);
  assert.equal(removed.code, 0, removed.out);
  assert.match(removed.out, /Remove OwnTV and its playlists from the TV/);
  assert.match(removed.out, /OwnTV removed/);
  assert.deepEqual(fake.readState().installed, [AERIAL]);

  ownTvInstalled({ stuck: true });
  const kept = await drive('bin/firetv-revert.js', [], tickOnlyOwnTv);
  assert.equal(kept.code, 1, kept.out);
  assert.match(kept.out, /OwnTV could not be removed/);
  assert.ok(fake.readState().installed.includes(OWNTV.pkg));
});
