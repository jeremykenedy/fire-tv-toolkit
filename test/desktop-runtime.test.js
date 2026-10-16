import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  setConfigDirectory,
  saveIp,
  getSavedIp,
} from '../src/device-config.js';
import {
  setAdbExecutable,
  isAdbInstalled,
  deviceInfo,
  putSetting,
  deleteSetting,
} from '../src/adb.js';
import { installFakeAdb } from './helpers/fake-adb.js';
import { HOME_REDIRECT } from '../src/launcher-registry.js';

test('desktop device folders keep saved IPs separate', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'firetv-storage-'));
  try {
    for (const ip of ['192.168.1.10', '192.168.1.11']) {
      const dir = path.join(root, ip);
      fs.mkdirSync(dir);
      setConfigDirectory(dir);
      saveIp(ip);
    }
    setConfigDirectory(path.join(root, '192.168.1.10'));
    assert.equal(getSavedIp(), '192.168.1.10');
    setConfigDirectory(path.join(root, '192.168.1.11'));
    assert.equal(getSavedIp(), '192.168.1.11');
    assert.throws(() => setConfigDirectory('../other'), /absolute/);
  } finally {
    setConfigDirectory(null);
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('desktop adb uses the selected executable and rejects relative paths', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'firetv-binary-'));
  const binary = path.join(root, 'bundled-adb');
  fs.writeFileSync(binary, '#!/bin/sh\n[ "$1" = "version" ]\n', {
    mode: 0o755,
  });
  try {
    setAdbExecutable(binary);
    assert.equal(await isAdbInstalled(), true);
    fs.rmSync(binary);
    assert.equal(await isAdbInstalled(), false);
    assert.throws(() => setAdbExecutable('relative/adb'), /absolute/);
  } finally {
    setAdbExecutable(null);
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('desktop discovery reads the model, Android version and device identity', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'firetv-properties-'));
  const binary = path.join(root, 'adb');
  fs.writeFileSync(
    binary,
    '#!/usr/bin/env node\nconst fs = require("node:fs");\nconst values = JSON.parse(fs.readFileSync(__filename + ".json", "utf8"));\nconsole.log(values[process.argv.at(-1)] || "");\n',
    { mode: 0o755 },
  );
  try {
    setAdbExecutable(binary);
    fs.writeFileSync(
      `${binary}.json`,
      JSON.stringify({
        'ro.product.model': 'Living room TV',
        'ro.build.version.release': '11',
        'ro.serialno': 'device-one',
      }),
    );
    assert.deepEqual(await deviceInfo('192.168.1.10'), {
      model: 'Living room TV',
      android: '11',
      serial: 'device-one',
    });
    fs.writeFileSync(`${binary}.json`, '{}');
    assert.deepEqual(await deviceInfo('192.168.1.10'), {
      model: 'Fire TV',
      android: '',
      serial: '',
    });
  } finally {
    setAdbExecutable(null);
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('desktop setting changes update a device guard configured by another client', async () => {
  const fake = installFakeAdb({
    installed: [HOME_REDIRECT.pkg],
    guard: { locked: true, remembered: {} },
  });
  try {
    setAdbExecutable(path.join(fake.dir, 'adb'), { rememberDeviceGuard: true });
    await putSetting('192.168.1.10', 'secure', 'sleep_timeout', 60000);
    assert.equal(
      fake.readState().guard.remembered['secure/sleep_timeout'],
      '60000',
    );
    await deleteSetting('192.168.1.10', 'secure', 'sleep_timeout');
    assert.equal(
      fake.readState().guard.remembered['secure/sleep_timeout'],
      'null',
    );
    await putSetting('192.168.1.10', 'secure', 'unrelated_key', 1);
    assert.equal(
      fake.readState().guard.remembered['secure/unrelated_key'],
      undefined,
    );
    setAdbExecutable(path.join(fake.dir, 'adb'));
    await putSetting('192.168.1.10', 'secure', 'sleep_timeout', 120000);
    assert.equal(
      fake.readState().guard.remembered['secure/sleep_timeout'],
      'null',
    );
  } finally {
    setAdbExecutable(null);
    fake.restore();
  }
});
