import { test, before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { drive, DOWN, ENTER } from './helpers/drive.js';
import { installFakeAdb, AERIAL, captured } from './helpers/fake-adb.js';
import { launcherFetch } from './helpers/launcher-fakes.js';
import { FIRE_TV_UI as UI, AT4K, LTV, HOME_REDIRECT, HOME_LAUNCHERS, launcherApps } from '../src/launcher-registry.js';
import { launcherState, servicesFor, useHome, installLauncherApp, removeLauncherApp } from '../src/apply/launcher.js';
import { setNativeUiHome, nativeUiHomePreference } from '../src/adb.js';
import { manageLauncher, FLAG_SPEC } from '../src/steps/launcher.js';

let fake;
let fetchBefore;
const ip = '192.0.2.4';
const key = 'enabled_accessibility_services';
const uiServices = `${UI.controlsService}:${UI.service}`;
function installed(services = 'reader/Service', enabled = '1') {
  fake.setState({ installed: [AERIAL, UI.pkg, AT4K.pkg, LTV.pkg, HOME_REDIRECT.pkg],
    secure: { ...fake.readState().secure, [key]: services, accessibility_enabled: enabled },
    uiHomeWanted: services.includes(UI.service),
    uiHomeFlags: { fire_tv_ui_home_enabled: services.includes(UI.service) } });
}
before(() => { fake = installFakeAdb(); fetchBefore = globalThis.fetch; globalThis.fetch = launcherFetch(); });
beforeEach(() => { fake.reset(); fake.setState({ versionCodes: { [UI.pkg]: 69 } }); process.exitCode = undefined; });
after(() => { globalThis.fetch = fetchBefore; fake.restore(); process.exitCode = undefined; });

test('recommended UI is first and needs no legacy redirect package', () => {
  assert.equal(HOME_LAUNCHERS[0], UI);
  assert.equal(UI.recommended, true);
  assert.deepEqual(launcherApps(UI.id), [UI]);
  assert.deepEqual(launcherApps(AT4K.id), [AT4K, HOME_REDIRECT]);
  assert.ok(FLAG_SPEC.use.choices.includes(UI.id));
});

test('UI Home uses its own two services and preserves unrelated services and guard settings', async () => {
  installed(`reader/Service:${AT4K.service}:${HOME_REDIRECT.service}`);
  const original = fake.readState();
  assert.equal(await useHome(ip, UI.id), true);
  const state = fake.readState();
  assert.equal(state.secure[key], `reader/Service:${uiServices}`);
  assert.equal(state.uiHomeWanted, true);
  assert.deepEqual(state.system, original.system);
  assert.equal(state.secure.screensaver_components, original.secure.screensaver_components);
  assert.equal((await launcherState(ip)).home, UI.id);
  assert.deepEqual(servicesFor([UI.service, UI.controlsService, 'reader/Service'], LTV.id), ['reader/Service', HOME_REDIRECT.service]);
});

test('choosing Amazon or AT4K tells UI to stop repairing its old Home choice', async () => {
  installed(`reader/Service:${uiServices}`);
  assert.equal(await useHome(ip, 'amazon'), true);
  assert.equal(fake.readState().uiHomeWanted, false);
  assert.equal(fake.readState().secure[key], 'reader/Service');
  assert.equal(await useHome(ip, AT4K.id), true);
  assert.equal(fake.readState().uiHomeWanted, false);
  assert.equal((await launcherState(ip)).home, AT4K.id);
});

test('receiver refusal fails without rewriting unrelated accessibility state', async () => {
  installed('reader/Service');
  fake.setState({ uiHomeReject: true });
  const before = fake.readState().secure;
  assert.equal(await useHome(ip, UI.id), false);
  assert.deepEqual(fake.readState().secure, before);
  await assert.rejects(setNativeUiHome(ip, true), /did not accept Home routing/);
});

test('invalid mode and incomplete UI accessibility state never report UI as selected', async () => {
  installed(UI.service);
  assert.equal((await launcherState(ip)).home, 'amazon');
  installed(uiServices, '0');
  assert.equal((await launcherState(ip)).home, 'amazon');
  const before = fake.readState();
  assert.equal(await useHome(ip, 'unknown'), false);
  assert.deepEqual(fake.readState(), before);
});

test('fresh UI install keeps Amazon selected and preserves services, idle timer and other options', async () => {
  fake.setState({ secure: { ...fake.readState().secure, [key]: 'reader/Service' } });
  const before = fake.readState();
  assert.deepEqual(await installLauncherApp(ip, { ...UI, versionCode: 69, sha256: undefined, icons: undefined }), { ok: true });
  const after = fake.readState();
  assert.equal(after.uiHomeWanted, false);
  assert.deepEqual(after.secure, before.secure);
  assert.deepEqual(after.system, before.system);
  assert.deepEqual(after.grants[UI.pkg], ['android.permission.WRITE_SECURE_SETTINGS']);
  assert.ok(!after.installed.includes(HOME_REDIRECT.pkg));
});

test('UI update restores the selected UI and all unrelated accessibility services dropped by install', async () => {
  installed(`reader/Service:${uiServices}`);
  fake.setState({ dropServicesOnInstall: true });
  const before = fake.readState().secure;
  assert.deepEqual(await installLauncherApp(ip, { ...UI, versionCode: 69, sha256: undefined, icons: undefined }), { ok: true });
  assert.deepEqual(fake.readState().secure, before);
  assert.equal(fake.readState().uiHomeWanted, true);
});

test('updating a disabled UI preserves its disabled state and current Home choice', async () => {
  installed(uiServices);
  fake.setState({disabled:[UI.pkg]});
  const before = await launcherState(ip);
  assert.equal(before.home, 'amazon');
  assert.equal((await installLauncherApp(ip, {...UI,sha256:undefined,icons:undefined})).ok, true);
  assert.equal((await launcherState(ip)).home, before.home);
  assert.ok(fake.readState().disabled.includes(UI.pkg));
});

test('UI update keeps LTvLauncher selected, and a failed install preserves it too', async () => {
  installed(`reader/Service:${HOME_REDIRECT.service}`);
  fake.setState({ guard: { home: 'ltv' }, dropServicesOnInstall: true });
  const before = fake.readState().secure;
  assert.deepEqual(await installLauncherApp(ip, { ...UI, versionCode: 69, sha256: undefined, icons: undefined }), { ok: true });
  assert.equal((await launcherState(ip)).home, 'ltv');
  assert.deepEqual(fake.readState().secure, before);
  fake.setState({ installFail: 'Failure [INSTALL_FAILED_UPDATE_INCOMPATIBLE]' });
  assert.equal((await installLauncherApp(ip, { ...UI, versionCode: 69, sha256: undefined, icons: undefined })).ok, false);
  assert.deepEqual(fake.readState().secure, before);
});

test('explicit UI CLI selection works without legacy Home Redirect and removal drops both own services', async () => {
  fake.setState({ installed: [AERIAL, UI.pkg] });
  const result = await captured(() => manageLauncher(ip, { use: UI.id }));
  assert.match(result.out, /now goes to Fire TV UI/);
  assert.equal((await launcherState(ip)).home, UI.id);
  assert.equal(await removeLauncherApp(ip, UI), true);
  assert.equal(fake.readState().secure[key], undefined);
});

test('failed Home readback restores UI preference and the exact original services', async () => {
  installed(`reader/Service:${uiServices}`);
  fake.setState({ dropNextSettingWrites: 1 });
  const before = fake.readState().secure;
  assert.equal(await useHome(ip, AT4K.id), false);
  assert.deepEqual(fake.readState().secure, before);
  assert.equal(fake.readState().uiHomeWanted, true);
});

test('installation preserves an explicitly empty services setting and disabled accessibility', async () => {
  fake.setState({ secure: { ...fake.readState().secure, [key]: '', accessibility_enabled: '0' } });
  const before = fake.readState().secure;
  assert.equal((await installLauncherApp(ip, { ...UI, versionCode: 69, sha256: undefined, icons: undefined })).ok, true);
  assert.deepEqual(fake.readState().secure, before);
});

test('direct selection refuses an absent UI, and a rejected CLI download never chooses Home', async () => {
  const before = fake.readState();
  assert.equal(await useHome(ip, UI.id), false);
  assert.deepEqual(fake.readState(), before);
  const result = await captured(() => manageLauncher(ip, { 'install-ui': true, use: UI.id }));
  assert.match(result.out, /checksum/i);
  assert.equal(process.exitCode, 1);
  assert.deepEqual(fake.readState().secure, before.secure);
  assert.ok(!fake.readState().installed.includes(HOME_REDIRECT.pkg));
});

test('failed rollback is reported explicitly rather than falsely claiming restoration', async () => {
  installed(`reader/Service:${uiServices}`);
  fake.setState({ uiCommitFail: true, dropRollbackSettingWrites: 1 });
  await assert.rejects(useHome(ip, AT4K.id), /did not restore its previous accessibility settings/);
});

test('native UI appears as an explicit recommended Home choice in the guided CLI', async () => {
  fake.setState({ installed: [AERIAL, UI.pkg] });
  fs.writeFileSync(fake.envFile, 'FIRE_TV_IP=192.0.2.4\nINSTALLED=true\n');
  const result = await drive('bin/firetv-launcher.js', [], [
    { expect: 'Use Fire TV UI as the home screen (recommended)', send: `${DOWN.repeat(3)}${ENTER}` },
    { expect: 'Nothing has been changed yet. Continue?', send: ENTER },
  ]);
  assert.equal(result.code, 0, result.out);
  assert.match(result.out, /now goes to Fire TV UI/);
  assert.equal(fake.readState().uiHomeWanted, true);
  assert.ok(!fake.readState().installed.includes(HOME_REDIRECT.pkg));
});

test('guided default recommends UI installation without silently switching Home', async () => {
  fs.writeFileSync(fake.envFile, 'FIRE_TV_IP=192.0.2.4\nINSTALLED=true\n');
  const preload = path.join(path.dirname(fileURLToPath(import.meta.url)), 'helpers', 'launcher-fetch-preload.js');
  const result = await drive('bin/firetv-launcher.js', [], [
    { expect: 'Install Fire TV UI (recommended)', send: ENTER },
    { expect: 'Nothing has been changed yet. Continue?', send: ENTER },
  ], { env: { NODE_OPTIONS: `--import=${preload}` } });
  assert.equal(result.code, 0, result.out);
  assert.ok(fake.readState().installed.includes(UI.pkg));
  assert.equal(fake.readState().uiHomeWanted, false);
  assert.equal(fake.readState().secure[key], undefined);
  assert.ok(!fake.readState().installed.includes(HOME_REDIRECT.pkg));
});

test('fresh install preserves absent accessibility keys and partial uninstall removes the remaining UI control service', async () => {
  assert.equal((await installLauncherApp(ip, { ...UI, versionCode: 69, sha256: undefined, icons: undefined })).ok, true);
  assert.equal(fake.readState().secure[key], undefined);
  assert.equal(fake.readState().secure.accessibility_enabled, undefined);
  fake.setState({ secure: { ...fake.readState().secure, [key]: UI.controlsService, accessibility_enabled: '1' } });
  assert.equal((await launcherState(ip)).home, 'amazon');
  assert.equal(await removeLauncherApp(ip, UI), true);
  assert.equal(fake.readState().secure[key], undefined);
});

test('orphaned UI service names without the app cannot be reported as selected', async () => {
  fake.setState({ secure: { ...fake.readState().secure, [key]: uiServices, accessibility_enabled: '1' } });
  assert.equal((await launcherState(ip)).home, 'amazon');
});

test('legacy Home target refusal is detected and restores the previous LTvLauncher choice', async () => {
  installed(`reader/Service:${HOME_REDIRECT.service}`);
  fake.setState({ guard: { home: 'ltv' }, homeWriteIgnored: true });
  const before = fake.readState().secure;
  assert.equal(await useHome(ip, AT4K.id), false);
  assert.deepEqual(fake.readState().secure, before);
  assert.equal((await launcherState(ip)).home, LTV.id);
});

test('updating the legacy redirect rebinds the existing AT4K Home choice after Android drops its services', async () => {
  fake.setState({ installed: [AERIAL, AT4K.pkg, HOME_REDIRECT.pkg],
    secure: { ...fake.readState().secure, [key]: `${AT4K.service}:${HOME_REDIRECT.service}`, accessibility_enabled: '1' },
    dropServicesOnInstall: true });
  await captured(() => manageLauncher(ip, { install: true }));
  assert.equal((await launcherState(ip)).home, AT4K.id);
});

test('installer reports an unsuccessful restoration and still removes its downloaded APK', async () => {
  installed(`reader/Service:${uiServices}`);
  fake.setState({ dropServicesOnInstall: true, dropNextSettingWrites: 4 });
  await assert.rejects(installLauncherApp(ip, { ...UI, versionCode: 69, sha256: undefined, icons: undefined }), /did not restore its previous accessibility settings/);
  assert.equal(fs.existsSync(fake.readState().lastInstallPath), false);
});

test('explicit UI selection clears competing redirect services even when UI already appears selected', async () => {
  installed(`reader/Service:${uiServices}:${HOME_REDIRECT.service}:${AT4K.service}`);
  const result = await captured(() => manageLauncher(ip, { use: UI.id }));
  assert.match(result.out, /now goes to Fire TV UI/);
  assert.equal(fake.readState().secure[key], `reader/Service:${uiServices}`);
});

test('disabled UI is not current Home; failed selection restores its disabled state', async () => {
  installed(uiServices);
  fake.setState({ disabled: [UI.pkg], uiHomeReject: true });
  assert.equal((await launcherState(ip)).home, 'amazon');
  assert.equal(await useHome(ip, UI.id), false);
  assert.deepEqual(fake.readState().disabled, [UI.pkg]);
  fake.setState({ uiHomeReject: false });
  assert.equal(await useHome(ip, UI.id), true);
  assert.deepEqual(fake.readState().disabled, []);
});

test('installer detects a TV that restores the services list but rejects the previous accessibility flag', async () => {
  installed('reader/Service', '0');
  fake.setState({ lockedKeys: ['accessibility_enabled'], accessibilityOnInstall: '1' });
  await assert.rejects(installLauncherApp(ip, { ...UI, versionCode: 69, sha256: undefined, icons: undefined }), /did not restore its previous accessibility settings/);
  assert.equal(fs.existsSync(fake.readState().lastInstallPath), false);
});

test('UI selection updates the enabled Toolkit guard route without turning off its other protection', async () => {
  installed(`reader/Service:${HOME_REDIRECT.service}`);
  fs.writeFileSync(fake.envFile, 'FIRE_TV_GUARD=on\n');
  fake.setState({ guard: { locked: true, remembered: { 'secure/sleep_timeout': '840000' } } });
  assert.equal(await useHome(ip, UI.id), true);
  assert.deepEqual(fake.readState().guard.remembered, {
    'secure/sleep_timeout': '840000',
    'secure/enabled_accessibility_services': `reader/Service:${uiServices}`,
  });
  assert.equal(fake.readState().guard.locked, true);
});

test('existing UI updates never normalize any private Home flags, including nonstandard combinations', async () => {
  for (const selected of [true, false]) {
    installed(selected ? `reader/Service:${uiServices}` : 'reader/Service');
    const flags = { fire_tv_ui_home_enabled: selected, start_on_boot: !selected,
      override_home_button: false, better_home_detection: false };
    fake.setState({ uiHomeFlags: flags, uiOperations: [], dropServicesOnInstall: true,
      grants: { [UI.pkg]: ['owner-retained-permission'] } });
    const services = fake.readState().secure;
    assert.equal((await installLauncherApp(ip, { ...UI, versionCode: 69, sha256: undefined, icons: undefined })).ok, true);
    assert.deepEqual(fake.readState().uiHomeFlags, flags);
    assert.deepEqual(fake.readState().uiOperations, []);
    assert.deepEqual(fake.readState().grants[UI.pkg], ['owner-retained-permission']);
    assert.deepEqual(fake.readState().secure, services);
  }
});

test('fresh install opts out of Home through preference-only API, without a Home rebind', async () => {
  assert.equal((await installLauncherApp(ip, { ...UI, versionCode: 69, sha256: undefined, icons: undefined })).ok, true);
  assert.deepEqual(fake.readState().uiOperations, ['home-preference-off']);
  assert.equal(fake.readState().uiHomeFlags.fire_tv_ui_home_enabled, false);
});


test('failed readback preserves mixed and missing private flags and never performs the full Home commit', async () => {
  const samples = [
    { fire_tv_ui_home_enabled: false, start_on_boot: true, override_home_button: false, better_home_detection: false },
    { start_on_boot: false, better_home_detection: false },
    { fire_tv_ui_home_enabled: true },
  ];
  for (const flags of samples) {
    const selectingUi = flags.fire_tv_ui_home_enabled !== true;
    installed(selectingUi ? 'reader/Service' : `reader/Service:${uiServices}`);
    fake.setState({ uiHomeFlags: flags, uiOperations: [], dropNextSettingWrites: 1 });
    const original = fake.readState();
    assert.equal(await useHome(ip, selectingUi ? UI.id : 'amazon'), false);
    assert.deepEqual(fake.readState().uiHomeFlags, flags);
    assert.deepEqual(fake.readState().secure, original.secure);
    assert.ok(!fake.readState().uiOperations.some(operation => operation === 'home-on' || operation === 'home-off'));
    assert.deepEqual(fake.readState().inputs || [], []);
  }
});

test('native full-commit failure rolls back all private flags including missing keys, then Toolkit restores the old preference and OS', async () => {
  for (const flags of [
    { fire_tv_ui_home_enabled: false, start_on_boot: true, override_home_button: false, better_home_detection: false },
    { start_on_boot: false },
  ]) {
    installed('reader/Service');
    fake.setState({ uiHomeFlags: flags, uiCommitFail: true, uiOperations: [] });
    const original = fake.readState().secure;
    assert.equal(await useHome(ip, UI.id), false);
    assert.deepEqual(fake.readState().uiHomeFlags, flags);
    assert.deepEqual(fake.readState().secure, original);
    assert.ok(fake.readState().uiOperations.includes('home-on'));
    assert.deepEqual(fake.readState().inputs || [], []);
  }
});

test('full Home commit happens after verified routing, and successful explicit Use may normalize its Home flags', async () => {
  installed('reader/Service');
  fake.setState({ uiHomeFlags: { start_on_boot: false, better_home_detection: false }, uiOperations: [] });
  assert.equal(await useHome(ip, UI.id), true);
  assert.equal(fake.readState().uiCommitServicesBefore, `reader/Service:${uiServices}`);
  assert.equal(fake.readState().uiCommitEnabledBefore, '1');
  assert.deepEqual(fake.readState().uiOperations, ['home-preference-on', 'home-on']);
  assert.deepEqual(fake.readState().uiHomeFlags, { fire_tv_ui_home_enabled: true, start_on_boot: true, override_home_button: true, better_home_detection: true });
  assert.equal(fake.readState().inputs.length, 1);
});

test('code 68 and unknown versions cannot mutate Home, while state exposes compatibility to the desktop', async () => {
  for (const codes of [{ [UI.pkg]: 68 }, {}]) {
    installed('reader/Service');
    fake.setState({ versionCodes: codes, uiHomeFlags: { start_on_boot: false } });
    const original = fake.readState();
    assert.equal((await launcherState(ip)).uiHomeSupported, false);
    assert.equal(await useHome(ip, UI.id), false);
    assert.deepEqual(fake.readState(), original);
  }
});

test('unsafe registry code 68 refuses installation before any device or private preference change', async () => {
  const original = fake.readState();
  const result = await installLauncherApp(ip, { ...UI, versionCode: 68, sha256: undefined, icons: undefined });
  assert.equal(result.ok, false);
  assert.match(result.error, /version code 69 or later/);
  assert.deepEqual(fake.readState(), original);
});

test('narrow preference state and clear preserve absence and the other three values', async () => {
  installed('reader/Service');
  fake.setState({ uiHomeFlags: { start_on_boot: false, override_home_button: true } });
  assert.equal(await nativeUiHomePreference(ip), null);
  await setNativeUiHome(ip, false, true);
  assert.equal(await nativeUiHomePreference(ip), false);
  await setNativeUiHome(ip, true, true);
  assert.equal(await nativeUiHomePreference(ip), true);
  await setNativeUiHome(ip, null, true);
  assert.deepEqual(fake.readState().uiHomeFlags, { start_on_boot: false, override_home_button: true });
});

test('CLI explains the code 69 requirement for an older installed UI without changing its state', async () => {
  installed('reader/Service');
  fake.setState({ versionCodes: { [UI.pkg]: 68 }, uiHomeFlags: { start_on_boot: false } });
  const original = fake.readState();
  const result = await captured(() => manageLauncher(ip, { use: UI.id }));
  assert.match(result.out, /Update Fire TV UI to version code 69 or later/);
  assert.equal(process.exitCode, 1);
  assert.deepEqual(fake.readState(), original);
});

test('unreviewed descriptor codes and mismatched installed versions cannot use the new API', async () => {
  const original = fake.readState();
  assert.equal((await installLauncherApp(ip, { ...UI, versionCode: undefined, sha256: undefined, icons: undefined })).ok, false);
  assert.deepEqual(fake.readState(), original);
  for (const codes of [{ [UI.pkg]: 68 }, {}]) {
    fake.reset();
    fake.setState({ versionCodes: codes });
    const result = await installLauncherApp(ip, { ...UI, versionCode: 69, sha256: undefined, icons: undefined });
    assert.equal(result.ok, false);
    assert.match(result.error, /does not provide the code 69/);
    assert.equal(fake.readState().uiOperations, undefined);
    assert.equal(fake.readState().grants, undefined);
  }
});

test('upgrading an existing code 68 UI to a reviewed code 69 candidate never invokes HomeControl or normalizes its private flags', async () => {
  installed(uiServices);
  const flags = { fire_tv_ui_home_enabled: true, start_on_boot: false, better_home_detection: false };
  fake.setState({ versionCodes: { [UI.pkg]: 68 }, installVersionCodes: { [UI.pkg]: 69 }, uiHomeFlags: flags, uiOperations: [] });
  assert.equal((await installLauncherApp(ip, { ...UI, versionCode: 69, sha256: undefined, icons: undefined })).ok, true);
  assert.deepEqual(fake.readState().uiHomeFlags, flags);
  assert.deepEqual(fake.readState().uiOperations, []);
  assert.equal((await launcherState(ip)).uiHomeSupported, true);
});
