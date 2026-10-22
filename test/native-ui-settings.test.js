import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { putSetting, deleteSetting, setAdbExecutable } from '../src/adb.js';

const UI = 'com.jeremykenedy.firetv.ui';
const IP = '192.168.1.74';

test('native UI settings persist through its guard and rejected writes never fall back to raw settings', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'firetv-native-settings-'));
  const binary = path.join(dir, 'adb');
  const statePath = binary + '.json';
  fs.writeFileSync(binary, `#!/usr/bin/env node
const fs = require('node:fs');
const file = __filename + '.json';
const state = JSON.parse(fs.readFileSync(file));
const args = process.argv.slice(2);
state.calls.push(args);
let reply = '';
if (args.includes('package')) reply = state.installed ? 'versionName=1.3.3' : 'Unable to find package';
else if (args.includes('broadcast')) {
  const extra = (key) => args[args.indexOf(key) + 1];
  if (state.mode === 'disconnect') { fs.writeFileSync(file, JSON.stringify(state)); process.exit(1); }
  reply = state.mode === 'reject' ? 'Broadcast completed: result=1, data="denied"'
    : state.mode === 'missing' ? 'Broadcast completed: result=0'
    : 'Broadcast completed: result=0, data="ok"';
  if (!state.mode) {
    const key = extra('namespace') + '/' + extra('key');
    state.desired[key] = extra('value');
    state.actual[key] = extra('value');
  }
} else if (args.includes('settings')) {
  const offset = args.indexOf('settings');
  const [operation, namespace, key, value] = args.slice(offset + 1);
  const setting = namespace + '/' + key;
  if (operation === 'get') reply = state.mode === 'mismatch' ? 'old' : state.actual[setting] ?? 'null';
  else if (operation === 'put') state.actual[setting] = state.installed && state.desired[setting] !== undefined
    ? state.desired[setting] : value;
  else if (operation === 'delete') delete state.actual[setting];
}
fs.writeFileSync(file, JSON.stringify(state));
console.log(reply);
`, { mode: 0o755 });
  const reset = (extra = {}) => fs.writeFileSync(statePath, JSON.stringify({
    installed: true, desired: { 'secure/sleep_timeout': '1200000' },
    actual: { 'secure/sleep_timeout': '1200000' }, calls: [], ...extra,
  }));
  const read = () => JSON.parse(fs.readFileSync(statePath));
  const rawWrites = () => read().calls.filter((call) => call.includes('settings') && (call.includes('put') || call.includes('delete')));
  try {
    setAdbExecutable(binary);
    for (const [namespace, key, value] of [
      ['secure', 'sleep_timeout', '0'], ['system', 'screen_off_timeout', '300000'],
      ['secure', 'str.auto_wake_up_enabled', '1'], ['secure', 'screensaver_enabled', '0'],
      ['secure', 'screensaver_components', 'example.saver/.Dream'],
    ]) {
      reset();
      await putSetting(IP, namespace, key, value);
      const state = read();
      assert.equal(state.desired[namespace + '/' + key], value);
      assert.equal(state.actual[namespace + '/' + key], value);
      assert.equal(rawWrites().length, 0);
      assert.ok(state.calls.some((call) => call.includes(UI + '/.BackupReceiver')));
      assert.ok(state.calls.every((call) => call[1] === IP + ':5555'));
    }
    for (const mode of ['reject', 'missing', 'disconnect', 'mismatch']) {
      reset({ mode });
      await assert.rejects(putSetting(IP, 'secure', 'sleep_timeout', 0));
      assert.equal(rawWrites().length, 0, mode + ' must fail closed');
    }
    reset();
    await deleteSetting(IP, 'secure', 'screensaver_components');
    assert.equal(read().desired['secure/screensaver_components'], 'null');
    for (const [namespace, key] of [['secure', 'sleep_timeout'], ['system', 'screen_off_timeout'],
      ['secure', 'screensaver_enabled'], ['secure', 'str.auto_wake_up_enabled']]) {
      reset();
      await assert.rejects(deleteSetting(IP, namespace, key), /cannot be cleared/i);
      assert.equal(rawWrites().length, 0);
    }
    reset({ installed: false });
    await putSetting(IP, 'secure', 'sleep_timeout', 60000);
    assert.equal(read().actual['secure/sleep_timeout'], '60000');
    assert.equal(rawWrites().length, 1);
    reset();
    await putSetting(IP, 'global', 'unrelated', 1);
    assert.equal(read().actual['global/unrelated'], '1');
    assert.equal(read().calls.length, 1);
  } finally {
    setAdbExecutable(null);
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
