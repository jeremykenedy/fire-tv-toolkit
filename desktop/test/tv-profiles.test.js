import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createTvProfiles } from '../tv-profiles.js';
import { isValidIp } from 'fire-tv-toolkit/src/device-config.js';

function fixture(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'toolkit-profiles-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  return { directory, file: path.join(directory, 'tv-profiles.json'),
    open: () => createTvProfiles(directory, isValidIp) };
}

test('a new installation starts without a selected TV or network access', t => {
  const h = fixture(t);
  assert.deepEqual(h.open().snapshot(), {
    profiles: [], activeProfileId: '', savedIp: '', profileError: '',
  });
  assert.equal(fs.existsSync(h.file), false);
});

test('the previous address migrates once without changing its original file', t => {
  const h = fixture(t);
  const legacy = path.join(h.directory, 'last-device.json');
  const bytes = '{ "ip": "192.0.2.10", "keep": true }\n';
  fs.writeFileSync(legacy, bytes);
  const first = h.open().snapshot();
  assert.equal(first.profiles[0].name, 'Fire TV');
  assert.equal(first.savedIp, '192.0.2.10');
  assert.equal(first.activeProfileId, first.profiles[0].id);
  assert.deepEqual(h.open().snapshot(), first);
  assert.equal(fs.readFileSync(legacy, 'utf8'), bytes);
  if (process.platform !== 'win32') assert.equal(fs.statSync(h.file).mode & 0o777, 0o600);
});

test('an invalid old address is not converted into a profile', t => {
  const h = fixture(t);
  fs.writeFileSync(path.join(h.directory, 'last-device.json'), '{"ip":42}');
  assert.equal(h.open().snapshot().savedIp, '');
});

test('named TVs can be added, selected, renamed and removed across restarts', t => {
  const h = fixture(t);
  const profiles = h.open();
  const first = profiles.save({ name: ' Living room ', ip: ' 192.0.2.10 ' });
  const original = first.activeProfileId;
  const second = profiles.save({ name: 'Bedroom', ip: '192.0.2.11' });
  const bedroom = second.activeProfileId;
  profiles.select(original);
  assert.equal(h.open().snapshot().savedIp, '192.0.2.10');
  profiles.save({ id: original, name: 'Main TV', ip: '192.0.2.12' });
  assert.deepEqual(profiles.snapshot().profiles.map(p => p.name), ['Main TV', 'Bedroom']);
  assert.equal(profiles.snapshot().savedIp, '192.0.2.12');
  profiles.remove(bedroom);
  assert.equal(profiles.snapshot().activeProfileId, original);
  profiles.remove(original);
  assert.deepEqual(h.open().snapshot().profiles, []);
  assert.equal(h.open().snapshot().savedIp, '');
  assert.equal(h.open().snapshot().activeProfileId, '');
});

test('manual address mode stays selected after reopening', t => {
  const h = fixture(t);
  const profiles = h.open();
  profiles.save({ name: 'Bedroom', ip: '192.0.2.11' });
  profiles.select('');
  assert.equal(h.open().snapshot().savedIp, '');
  assert.equal(h.open().snapshot().profiles.length, 1);
});

test('invalid profile changes and duplicate addresses preserve the saved list', t => {
  const h = fixture(t);
  const profiles = h.open();
  profiles.save({ name: 'Main TV', ip: '192.0.2.10' });
  const expected = profiles.snapshot();
  for (const value of [null, [], 'TV', { id: 0 },
    { id: 'missing', name: 'Other', ip: '192.0.2.11' },
    { name: '', ip: '192.0.2.11' }, { name: 'x'.repeat(65), ip: '192.0.2.11' },
    { name: 'bad\nname', ip: '192.0.2.11' }, { name: 4, ip: '192.0.2.11' },
    { name: 'Other', ip: 42 }, { name: 'Other', ip: '999.0.2.11' },
    { name: 'Duplicate', ip: '192.0.2.10' }]) assert.throws(() => profiles.save(value));
  assert.throws(() => profiles.select('missing'));
  assert.throws(() => profiles.remove('missing'));
  assert.deepEqual(profiles.snapshot(), expected);
  assert.deepEqual(h.open().snapshot(), expected);
});

test('returned profile data cannot mutate the stored addresses', t => {
  const h = fixture(t);
  const profiles = h.open();
  const result = profiles.save({ name: 'Main TV', ip: '192.0.2.10' });
  result.profiles[0].ip = '192.0.2.99';
  assert.equal(profiles.snapshot().savedIp, '192.0.2.10');
});

test('successful connections remember new addresses and retain custom names', t => {
  const h = fixture(t);
  const profiles = h.open();
  profiles.remember('192.0.2.10');
  const id = profiles.snapshot().activeProfileId;
  profiles.save({ id, name: 'Main TV', ip: '192.0.2.10' });
  profiles.remember('192.0.2.11');
  profiles.remember('192.0.2.12');
  profiles.remember('192.0.2.10');
  assert.equal(profiles.snapshot().activeProfileId, id);
  assert.deepEqual(profiles.snapshot().profiles.map(p => p.name), ['Main TV', 'Fire TV 1', 'Fire TV 2']);
});

test('unreadable, corrupt or unsupported profiles are retained without silent replacement', t => {
  const h = fixture(t);
  for (const raw of ['{bad', 'null', '{}', '{"version":2,"profiles":[]}',
    JSON.stringify({ version: 1, profiles: [null], activeId: '' }),
    JSON.stringify({ version: 1, profiles: [], activeId: 'missing' }),
    JSON.stringify({ version: 1, profiles: [], activeId: 4 }),
    JSON.stringify({ version: 1, profiles: [
      { id: 'a', name: 'A', ip: '192.0.2.1' },
      { id: 'a', name: 'B', ip: '192.0.2.2' },
    ], activeId: '' }),
    JSON.stringify({ version: 1, profiles: [
      { id: 'a', name: 'A', ip: '192.0.2.1' },
      { id: 'b', name: 'B', ip: '192.0.2.1' },
    ], activeId: '' })]) {
    fs.writeFileSync(h.file, raw);
    const profiles = h.open();
    assert.match(profiles.snapshot().profileError, /original file was kept/);
    assert.throws(() => profiles.save({ name: 'New', ip: '192.0.2.3' }), /original file/);
    assert.throws(() => profiles.select(''), /original file/);
    assert.throws(() => profiles.remove('a'), /original file/);
    profiles.remember('192.0.2.3');
    assert.equal(fs.readFileSync(h.file, 'utf8'), raw);
  }
});

test('a failed atomic replacement keeps the previous in-memory and on-disk profile', t => {
  const h = fixture(t);
  const profiles = h.open();
  profiles.save({ name: 'Main TV', ip: '192.0.2.10' });
  const before = profiles.snapshot();
  const bytes = fs.readFileSync(h.file, 'utf8');
  t.mock.method(fs, 'renameSync', () => { throw new Error('Disk unavailable'); });
  assert.throws(() => profiles.save({ name: 'Bedroom', ip: '192.0.2.11' }), /Disk/);
  assert.deepEqual(profiles.snapshot(), before);
  assert.equal(fs.readFileSync(h.file, 'utf8'), bytes);
});
