import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SCREENSAVERS, AMAZON_DEFAULT, sameComponent } from '../src/screensaver-registry.js';

const REQUIRED_FIELDS = ['id', 'name', 'pkg', 'dreamComponent', 'repo', 'blurb'];

test('every screensaver entry has all required fields, non-empty', () => {
  for (const entry of SCREENSAVERS) {
    for (const field of REQUIRED_FIELDS) {
      assert.ok(entry[field] && entry[field].length > 0, `${entry.id || '(unknown)'} is missing "${field}"`);
    }
  }
});

test('screensaver ids are unique', () => {
  const ids = SCREENSAVERS.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('screensaver package names are unique', () => {
  const pkgs = SCREENSAVERS.map((s) => s.pkg);
  assert.equal(new Set(pkgs).size, pkgs.length);
});

test('Skyburst Nocturne, Pulse Circuit and Helios Lightfield keep their published package identities', () => {
  const expected = {
    'skyburst-nocturne': [
      'com.jeremykenedy.skyburstnocturne',
      'com.jeremykenedy.skyburstnocturne/.FireworksDreamService',
      'jeremykenedy/skyburst-nocturne',
    ],
    'pulse-circuit': [
      'com.jeremykenedy.pulsecircuit',
      'com.jeremykenedy.pulsecircuit/.PulseDreamService',
      'jeremykenedy/pulse-circuit',
    ],
    'helios-lightfield': [
      'com.jeremykenedy.helioslightfield',
      'com.jeremykenedy.helioslightfield/.HeliosLightfieldDreamService',
      'jeremykenedy/helios-lightfield',
    ],
  };

  for (const [id, [pkg, dreamComponent, repo]] of Object.entries(expected)) {
    const entry = SCREENSAVERS.find((screensaver) => screensaver.id === id);
    assert.ok(entry, `${id} should be available to the installer`);
    assert.equal(entry.pkg, pkg);
    assert.equal(entry.dreamComponent, dreamComponent);
    assert.equal(entry.repo, repo);
  }
});

test('every dreamComponent starts with its own package name', () => {
  for (const entry of SCREENSAVERS) {
    assert.ok(
      entry.dreamComponent.startsWith(`${entry.pkg}/`),
      `${entry.id}: dreamComponent "${entry.dreamComponent}" does not start with pkg "${entry.pkg}/"`
    );
  }
});

test('every repo is under jeremykenedy, or is a trusted author pinned by tag, asset and SHA-256', () => {
  for (const entry of SCREENSAVERS.filter((s) => !s.repo.startsWith('jeremykenedy/'))) {
    assert.ok(entry.tag && entry.asset, `${entry.id}: "${entry.repo}" needs a pinned tag and asset`);
    assert.match(entry.sha256 || '', /^[0-9a-f]{64}$/, `${entry.id}: "${entry.repo}" needs a pinned SHA-256`);
  }
  assert.equal(SCREENSAVERS.find((s) => s.id === 'aerial').repo, 'theothernt/AerialViews');
});

test('AMAZON_DEFAULT has the fields the rest of the code relies on', () => {
  assert.ok(AMAZON_DEFAULT.name);
  assert.ok(AMAZON_DEFAULT.pkg);
  assert.ok(AMAZON_DEFAULT.dreamComponent.startsWith(`${AMAZON_DEFAULT.pkg}/`));
});

test('AMAZON_DEFAULT is not duplicated inside the SCREENSAVERS list', () => {
  const pkgs = SCREENSAVERS.map((s) => s.pkg);
  assert.ok(!pkgs.includes(AMAZON_DEFAULT.pkg));
});

import { parseSha256FromNotes } from '../src/apply/screensavers.js';

test('parseSha256FromNotes reads the recorded checksum, case-insensitively, from release notes', () => {
  const hex = 'A'.repeat(64);
  assert.equal(parseSha256FromNotes(`Mirror.\nSHA-256: ${hex}\nmore`), 'a'.repeat(64));
});

test('parseSha256FromNotes returns null when the notes record no valid checksum', () => {
  assert.equal(parseSha256FromNotes('no checksum here'), null);
  assert.equal(parseSha256FromNotes('SHA-256: tooshort'), null);
  assert.equal(parseSha256FromNotes(null), null);
  assert.equal(parseSha256FromNotes(undefined), null);
});

test('sameComponent matches the short and long forms of a component, and nothing else', () => {
  assert.ok(sameComponent('com.overdevs.snoozy/.SnoozyDreamService', 'com.overdevs.snoozy/com.overdevs.snoozy.SnoozyDreamService'));
  assert.ok(sameComponent('a.b/.C', 'a.b/.C'));
  assert.ok(!sameComponent('a.b/.C', 'a.b/.D'));
  assert.ok(!sameComponent(null, 'a.b/.C'));
  assert.ok(sameComponent(null, null));
});

test('classic and filmed jellyfish remain separate install and selection targets', () => {
  const classic = SCREENSAVERS.find((entry) => entry.id === 'jellyfish-drift');
  const filmed = SCREENSAVERS.find((entry) => entry.id === 'jellyfish-drift-v2');
  assert.equal(classic.pkg, 'com.jeremykenedy.jellyfishdrift');
  assert.equal(filmed.pkg, 'com.jeremykenedy.jellyfishdriftv2');
  assert.equal(filmed.repo, 'jeremykenedy/jellyfish-drift-v2');
  assert.equal(filmed.asset, 'jellyfish-drift-v2.apk');
  assert.notEqual(classic.dreamComponent, filmed.dreamComponent);
});

test('Black Screen Dream has a separate installation and selection identity', () => {
  const entry = SCREENSAVERS.find((saver) => saver.id === 'black-screen-dream');
  assert.equal(entry.pkg, 'com.jeremykenedy.blackscreendream');
  assert.equal(entry.dreamComponent, 'com.jeremykenedy.blackscreendream/.BlackScreenDreamService');
  assert.equal(entry.repo, 'jeremykenedy/black-screen-dream');
});
