import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { setEnvPathForTesting } from '../../src/device-config.js';
import { setScreensaversDirForTesting } from '../../src/apply/screensavers.js';


const SCRIPT = `#!/usr/bin/env node
const fs = require('node:fs');
const statePath = process.env.FAKE_ADB_STATE;
const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
const save = () => fs.writeFileSync(statePath, JSON.stringify(state));
let args = process.argv.slice(2);
if (args[0] === '-s') args = args.slice(2);
const fail = (msg) => { process.stderr.write(msg + '\\n'); process.exit(1); };
const out = (text) => process.stdout.write(text + '\\n');
if (state.offline && args[0] !== 'version') fail("adb: device '" + (process.env.FAKE_ADB_TARGET || 'x') + "' not found");
// state.offlineIps: only these TV addresses are unreachable.
const host = (process.argv[2] === '-s' ? process.argv[3] : args[0] === 'connect' ? args[1] : '') || '';
if ((state.offlineIps || []).includes(host.split(':')[0])) fail("adb: device '" + host + "' not found");
const [cmd, a, b, c, d] = args;
if (cmd === 'version') { out('Android Debug Bridge version 1.0.41'); }
else if (cmd === 'connect') { out('connected to ' + a); }
else if (cmd === 'install') {
  state.lastInstallPath = args[args.length - 1]; save();
  if (state.installFail) fail(state.installFail);
  // A test APK may name its own package as "pkg:<name>"; otherwise use installOnApk.
  const body = fs.readFileSync(args[args.length - 1], 'utf8');
  const named = body.startsWith('pkg:') ? [body.slice(4).trim()] : state.installOnApk || [];
  for (const p of named) if (!state.installed.includes(p)) state.installed.push(p);
  for (const p of named) if (state.installVersionCodes?.[p]) state.versionCodes = { ...state.versionCodes, [p]: state.installVersionCodes[p] };
  for (const p of named) if (state.installVersions?.[p]) {
    state.versions = { ...state.versions, [p]: state.installVersions[p] };
  }
  // Like Android dropping an updated accessibility app from the enabled list.
  if (state.dropServicesOnInstall && state.secure) delete state.secure.enabled_accessibility_services;
  if (state.accessibilityOnInstall !== undefined) state.secure.accessibility_enabled = state.accessibilityOnInstall;
  save(); out('Success');
}
else if (cmd === 'shell' && a === 'input') { state.inputs = [...(state.inputs || []), args.slice(2)]; save(); out(''); }
else if (cmd === 'shell' && a === 'monkey') {
  const p = args[args.indexOf('-p') + 1];
  if (!state.installed.includes(p) || (state.unopenable || []).includes(p)) fail('** No activities found to run, monkey aborted.');
  state.opened = p; save(); out('Events injected: 1');
}
else if (cmd === 'shell' && a === 'cmd' && b === 'notification') {
  // state.listenerIgnored: the TV accepts the command and keeps its old list.
  const key = 'enabled_notification_listeners';
  const list = (state.secure[key] || '').split(':').filter(Boolean).filter((x) => x !== d);
  if (c === 'allow_listener') list.push(d);
  if (!state.listenerIgnored) { if (list.length) state.secure[key] = list.join(':'); else delete state.secure[key]; save(); }
}
else if (cmd === 'shell' && a === 'ls') {
  const dir = args[args.length - 1].endsWith('/') ? args[args.length - 1].slice(0, -1) : args[args.length - 1];
  for (const f of Object.keys(state.files || {})) if (f.startsWith(dir + '/')) out(f.slice(dir.length + 1));
}
else if (cmd === 'shell' && a === 'settings' && b === 'delete') {
  if (state[c]) delete state[c][d];
  save(); out('Deleted 1 rows');
}
else if (cmd === 'shell' && a === 'pm' && b === 'enable') {
  if (!state.installed.includes(c)) fail('Error: Unknown package: ' + c);
  state.disabled = (state.disabled || []).filter((p) => p !== c); save(); out('Package ' + c + ' new state: enabled');
}
else if (cmd === 'shell' && a === 'pm' && b === 'grant') {
  state.grants = state.grants || {}; state.grants[c] = [...(state.grants[c] || []), d]; save();
}
else if (cmd === 'shell' && a === 'appops' && b === 'get') {
  const mode = ((state.appops || {})[c] || {})[d];
  out(mode ? d + ': ' + mode + '; time=+1d' : 'No operations.');
}
else if (cmd === 'shell' && a === 'appops' && b === 'set') {
  const pkg = c === '--uid' ? d : c;
  const op = c === '--uid' ? args[5] : d;
  if ((state.lockedKeys || []).includes(op)) { process.exit(0); }
  state.appops = state.appops || {}; state.appops[pkg] = { ...(state.appops[pkg] || {}), [op]: process.argv.slice(-1)[0] };
  if (process.argv.slice(-1)[0] === 'default') delete state.appops[pkg][op];
  save();
}
else if (cmd === 'shell' && a === 'am' && b === 'broadcast' && args.includes('com.jeremykenedy.firetv.homeredirect/.GuardReceiver')) {
  // The guard in Home Redirect: replies only when Home Redirect is installed.
  const extra = (name) => { const i = args.indexOf(name); return i < 0 ? undefined : args[i + 1]; };
  if (extra('cmd') === 'check' && state.guardCheckDisconnects > 0) {
    state.guardCheckDisconnects--; save(); process.exit(255);
  }
  if (extra('cmd') === 'home' && state.homeDisconnects > 0) {
    state.homeDisconnects--; save(); process.exit(255);
  }
  if (!state.installed.includes('com.jeremykenedy.firetv.homeredirect')) { out('Broadcasting: Intent\\nBroadcast completed: result=0'); }
  else {
    const g = state.guard = state.guard || { locked: false, remembered: {} };
    const cmdName = extra('cmd');
    let reply = 'unknown';
    if (cmdName === 'lock') { g.locked = true; g.forgotten = []; reply = state.guardReply || 'locked'; }
    else if (cmdName === 'unlock') { g.locked = false; reply = state.guardReply || 'unlocked'; }
    else if (cmdName === 'remember') { g.remembered[extra('setting')] = extra('value'); reply = 'remembered'; }
    else if (cmdName === 'forget') { g.forgotten = [...(g.forgotten || []), extra('setting')]; reply = state.forgetReply || 'forgotten'; }
    else if (cmdName === 'check') { reply = state.guardReply || 'guard=' + (g.locked ? 'on' : 'off') + ' restored=' + (state.guardRestored || 'none'); }
    else if (cmdName === 'home' && !state.homeRedirectWithoutTargets) {
      const value = extra('value');
      if (value === undefined || value === 'at4k' || value === 'ltv') {
        if (value && !state.homeWriteIgnored) g.home = value;
        reply = 'home=' + (g.home || 'at4k');
      }
    }
    save(); out('Broadcasting: Intent\\nBroadcast completed: result=0, data="' + reply + '"');
  }
}
else if (cmd === 'shell' && a === 'am' && b === 'broadcast' && args.includes('com.jeremykenedy.firetv.ui/.BackupReceiver')) {
  const operation = args[args.indexOf('operation') + 1];
  const modern = (state.versionCodes || {})['com.jeremykenedy.firetv.ui'] >= 69;
  if (!state.installed.includes('com.jeremykenedy.firetv.ui') || state.uiHomeReject || (!modern && ['home-preference-state', 'home-preference-clear'].includes(operation))) {
    out('Broadcast completed: result=1, data="unsupported"');
  } else if (operation === 'home-preference-state') {
    const flags = state.uiHomeFlags || {};
    const value = Object.hasOwn(flags, 'fire_tv_ui_home_enabled') ? (flags.fire_tv_ui_home_enabled ? 'on' : 'off') : 'unset';
    out('Broadcast completed: result=0, data="home-preference=' + value + '"');
  } else {
    state.uiOperations = [...(state.uiOperations || []), operation];
    const beforeFlags = { ...(state.uiHomeFlags || {}) };
    const beforeServices = state.secure.enabled_accessibility_services;
    const beforeEnabled = state.secure.accessibility_enabled;
    state.uiHomeWanted = operation.endsWith('-on');
    if (operation === 'home-preference-clear') {
      state.uiHomeFlags = { ...beforeFlags };
      delete state.uiHomeFlags.fire_tv_ui_home_enabled;
      state.uiHomeWanted = true;
    } else if (modern && operation.includes('preference')) {
      state.uiHomeFlags = { ...beforeFlags, fire_tv_ui_home_enabled: state.uiHomeWanted };
    } else {
      state.uiHomeFlags = { fire_tv_ui_home_enabled: state.uiHomeWanted, start_on_boot: state.uiHomeWanted, override_home_button: state.uiHomeWanted, better_home_detection: true };
    }
    if (!operation.includes('preference')) {
      state.uiCommitServicesBefore = beforeServices;
      state.uiCommitEnabledBefore = beforeEnabled;
      const own = ['com.jeremykenedy.firetv.ui/com.jeremykenedy.firetv.ui.Hra', 'com.jeremykenedy.firetv.ui/com.jeremykenedy.firetv.ui.HomeRedirectService'];
      let list = (state.secure.enabled_accessibility_services || '').split(':').filter(Boolean).filter(s => !own.includes(s));
      if (state.uiHomeWanted) {
        list = list.filter(s => !['com.overdevs.at4k/com.overdevs.at4k.Hra', 'com.jeremykenedy.firetv.homeredirect/com.jeremykenedy.firetv.homeredirect.HomeRedirectService', 'com.overdevs.at4khelper/com.overdevs.at4khelper.HomeRedirectAccessibilityService'].includes(s));
        list.push(...own);
      }
      state.secure.enabled_accessibility_services = list.join(':');
      state.secure.accessibility_enabled = list.length ? '1' : '0';
      if (state.uiCommitFail) {
        state.uiHomeFlags = beforeFlags;
        state.uiHomeWanted = Object.hasOwn(beforeFlags, 'fire_tv_ui_home_enabled') ? beforeFlags.fire_tv_ui_home_enabled : true;
        if (beforeServices === undefined) delete state.secure.enabled_accessibility_services;
        else state.secure.enabled_accessibility_services = beforeServices;
        if (beforeEnabled === undefined) delete state.secure.accessibility_enabled;
        else state.secure.accessibility_enabled = beforeEnabled;
        state.dropNextSettingWrites = state.dropRollbackSettingWrites || 0;
        save(); out('Broadcast completed: result=1, data="write failed"'); process.exit(0);
      }
    }
    save(); out('Broadcast completed: result=0, data="ok"');
  }
}
else if (cmd === 'shell' && a === 'dumpsys' && b === 'package') {
  const v = (state.versions || {})[c];
  const code = (state.versionCodes || {})[c];
  out(state.installed.includes(c) ? 'Packages:\\n    versionName=' + (v || '1.0.0') + (code === undefined ? '' : '\\n    versionCode=' + code) : 'Unable to find package: ' + c);
}
else if (cmd === 'shell' && a === 'pm' && b === 'disable-user') {
  const pkg = args[args.length - 1];
  if ((state.protectedPkgs || []).includes(pkg)) fail('java.lang.SecurityException: Cannot disable a protected package: ' + pkg);
  if (!(state.lockedKeys || []).includes(pkg)) { state.disabled = [...new Set([...(state.disabled || []), pkg])]; save(); }
  out('Package ' + pkg + ' new state: disabled-user');
}
else if (cmd === 'shell' && a === 'echo') { out(state.echoReply === undefined ? b : state.echoReply); }
else if (cmd === 'shell' && a === 'settings' && b === 'get') {
  const v = (state[c] || {})[d];
  out(v === undefined ? 'null' : v);
} else if (cmd === 'shell' && a === 'settings' && b === 'put') {
  if (state.rejectOverMax && c === 'system' && d === 'screen_off_timeout' && Number(process.argv.slice(-1)[0]) > 2147460000) fail('java.lang.IllegalArgumentException: value too large');
  // lockedKeys: the TV takes the write without error but nothing changes.
  if (state.dropNextSettingWrites > 0) { state.dropNextSettingWrites--; save(); process.exit(0); }
  if ((state.lockedKeys || []).includes(d)) { process.exit(0); }
  state[c] = state[c] || {}; state[c][d] = process.argv.slice(-1)[0]; save();
} else if (cmd === 'shell' && a === 'settings' && b === 'list') {
  for (const [k, v] of Object.entries(state[c] || {})) out(k + '=' + v);
} else if (cmd === 'shell' && a === 'pm' && b === 'list') {
  const only = args.includes('-d') ? state.disabled || [] : state.installed;
  for (const p of only) out('package:' + p);
} else if (cmd === 'shell' && a === 'pm' && b === 'uninstall') {
  if (state.installed.includes(c) && !state.stuck) { state.installed = state.installed.filter((p) => p !== c); save(); out('Success'); }
  else out('Failure [DELETE_FAILED_INTERNAL_ERROR]');
} else if (cmd === 'shell' && a === 'getprop') {
  out(state.sdk === undefined ? '30' : state.sdk);
} else if (cmd === 'push') {
  if (args[args.length - 1] === '/sdcard/Pictures/Icons/') {
    state.sharedIcons = state.sharedIcons || {};
    for (const file of args.slice(1, -1)) state.sharedIcons[require('node:path').basename(file)] = fs.readFileSync(file).toString('base64');
  } else { state.files = state.files || {}; state.files[b] = fs.readFileSync(a,'utf8'); }
  save();
} else if (cmd === 'shell' && a === 'mkdir' && c === '/sdcard/Pictures/Icons') {
  out('');
} else if (cmd === 'shell' && a === 'am' && b === 'broadcast' && args.includes('android.intent.action.MEDIA_SCANNER_SCAN_FILE')) {
  const name = args[args.length - 1].split('/').pop();
  if (!state.iconIndexMissing) {
    state.iconMedia = state.iconMedia || {};
    if (!state.iconMedia[name]) state.iconMedia[name] = {id:Object.keys(state.iconMedia).length + 1,pending:1};
  }
  save(); out('Broadcast completed: result=0');
} else if (cmd === 'shell' && a.startsWith('content query --uri content://media/external/images/media ')) {
  if (!a.endsWith(${JSON.stringify('--where "relative_path=\'Pictures/Icons/\'"')})) fail('incorrect SQL quoting');
  for (const [name,row] of Object.entries(state.iconMedia || {})) out('_id=' + row.id + ', _display_name=' + name + ', is_pending=' + row.pending);
} else if (cmd === 'shell' && a === 'content' && b === 'update') {
  const id = Number(d.split('/').pop());
  for (const row of Object.values(state.iconMedia || {})) if (row.id === id && !state.iconPublishIgnored) row.pending = 0;
  save(); out('Updated 1 rows.');
} else if (cmd === 'pull') {
  if (!Object.hasOwn(state.files || {}, a)) fail('remote file does not exist');
  fs.writeFileSync(b,state.transferMismatch ? 'corrupt' : state.files[a]);
} else if (cmd === 'shell' && a === 'test') {
  if (!Object.hasOwn(state.files || {}, c)) process.exit(1);
} else if (cmd === 'shell' && a === 'rm') {
  if (state.files) delete state.files[c]; save();
} else if (cmd === 'shell' && a === 'am' && ['start','force-stop'].includes(b)) {
  state.opened = args[args.length - 1]; save();
} else { fail('fake adb: unsupported ' + args.join(' ')); }
`;

export const AERIAL = 'com.neilturner.aerialviews';

/**
 * Builds a throwaway "adb" executable that keeps a fake Fire TV's settings and
 * packages in a JSON file, puts it first on PATH, and points the app's .env
 * and screensaver folders at temp locations so a test can never touch the
 * real .env, the real repo, or a real TV.
 * @param {object} [overrides] state overrides, merged over the defaults
 */
export function installFakeAdb(overrides = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'firetv-fake-'));
  const bin = path.join(dir, 'adb');
  fs.writeFileSync(bin, SCRIPT, { mode: 0o755 });
  const statePath = path.join(dir, 'state.json');
  const state = {
    secure: { 'str.auto_wake_up_enabled': '1', sleep_timeout: '840000', screensaver_components: `${AERIAL}/${AERIAL}.Dream` },
    system: { screen_off_timeout: '300000' },
    installed: [AERIAL],
    ...overrides,
  };
  const defaults = JSON.parse(JSON.stringify(state));
  fs.writeFileSync(statePath, JSON.stringify(state));

  const saved = { PATH: process.env.PATH, ...Object.fromEntries(['FAKE_ADB_STATE', 'FIRE_TV_TEST_ENV_FILE', 'FIRE_TV_TEST_SCREENSAVERS_DIR', 'ANDROID_ADB_SERVER_PORT'].map((k) => [k, process.env[k]])) };
  process.env.PATH = `${dir}${path.delimiter}${process.env.PATH}`;
  process.env.FAKE_ADB_STATE = statePath;
  // Safety net: if a real adb is ever reached by mistake, point it at a port
  // no adb server listens on, so it can never talk to a real TV.
  process.env.ANDROID_ADB_SERVER_PORT = '1';
  process.env.FIRE_TV_TEST_ENV_FILE = path.join(dir, '.env');
  process.env.FIRE_TV_TEST_SCREENSAVERS_DIR = path.join(dir, 'screensavers');
  setEnvPathForTesting(process.env.FIRE_TV_TEST_ENV_FILE);
  setScreensaversDirForTesting(process.env.FIRE_TV_TEST_SCREENSAVERS_DIR);

  return {
    dir,
    envFile: process.env.FIRE_TV_TEST_ENV_FILE,
    readState: () => JSON.parse(fs.readFileSync(statePath, 'utf8')),
    setState: (patch) => fs.writeFileSync(statePath, JSON.stringify({ ...JSON.parse(fs.readFileSync(statePath, 'utf8')), ...patch })),
    /** Puts the fake device back to its defaults and clears the temp .env and clones. */
    reset() {
      fs.writeFileSync(statePath, JSON.stringify(defaults));
      fs.rmSync(process.env.FIRE_TV_TEST_ENV_FILE, { recursive: true, force: true });
      fs.rmSync(process.env.FIRE_TV_TEST_SCREENSAVERS_DIR, { recursive: true, force: true });
    },
    restore() {
      setEnvPathForTesting(null);
      setScreensaversDirForTesting(null);
      for (const [k, v] of Object.entries(saved)) {
        if (v === undefined) delete process.env[k];
        else process.env[k] = v;
      }
      fs.rmSync(dir, { recursive: true, force: true });
    },
  };
}

/**
 * Runs fn with stdout/stderr captured, so the real output of a step can be
 * asserted on without spamming the test run.
 * @returns {Promise<{result: any, out: string}>}
 */
export async function captured(fn) {
  const chunks = [];
  const realOut = process.stdout.write.bind(process.stdout);
  const realErr = process.stderr.write.bind(process.stderr);
  // The test runner reports over stdout using non-string frames; only string
  // writes (the app's own output) are captured, everything else passes through.
  const grab = (real) => (chunk, ...rest) => {
    if (typeof chunk === 'string') {
      chunks.push(chunk);
      return true;
    }
    return real(chunk, ...rest);
  };
  process.stdout.write = grab(realOut);
  process.stderr.write = grab(realErr);
  try {
    const result = await fn();
    return { result, out: chunks.join('') };
  } finally {
    process.stdout.write = realOut;
    process.stderr.write = realErr;
  }
}
