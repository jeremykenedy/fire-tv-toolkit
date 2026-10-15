import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { COMMANDS, GROUPS, renderCommandTable, wrapWords } from '../src/command-list.js';

const pkg = JSON.parse(readFileSync(fileURLToPath(new URL('../package.json', import.meta.url)), 'utf8'));

test('COMMANDS lists every command in package.json "bin", and nothing else', () => {
  const pkgNames = Object.keys(pkg.bin).sort();
  const listedNames = COMMANDS.map((c) => c.name).sort();
  assert.deepEqual(listedNames, pkgNames);
});

test('every COMMANDS entry has a non-empty name and description', () => {
  for (const { name, desc } of COMMANDS) {
    assert.ok(name && name.trim().length > 0);
    assert.ok(desc && desc.trim().length > 0);
  }
});

test('every command belongs to a group the table shows', () => {
  for (const { name, group } of COMMANDS) {
    assert.ok(GROUPS.includes(group), `${name} has group ${group}`);
  }
});

test('wrapWords breaks between words and gives an overlong word its own line', () => {
  assert.deepEqual(wrapWords('one two three four', 9), ['one two', 'three', 'four']);
  assert.deepEqual(wrapWords('a firetv-timeouts-possible b', 6), ['a', 'firetv-timeouts-possible', 'b']);
});

test('the command table is boxed, as wide as the terminal, and lists every command under its group', () => {
  for (const width of [100, 72]) {
    const lines = renderCommandTable(width);
    assert.ok(lines.every((line) => line.length === width), `every line is ${width} wide`);
    assert.match(lines[0], /^┌─+┬─+┐$/);
    assert.match(lines[1], /^│ Command +│ What it does +│$/);
    assert.match(lines.at(-1), /^└─+┴─+┘$/);
    const firstCells = lines.map((line) => line.split('│')[1]?.trim()).filter(Boolean);
    assert.deepEqual(firstCells.filter((cell) => GROUPS.includes(cell)), GROUPS);
    for (const { name } of COMMANDS) {
      assert.equal(firstCells.filter((cell) => cell === name).length, 1, `${name} appears once`);
    }
    const order = GROUPS.map((group) => firstCells.indexOf(group));
    for (const { name, group } of COMMANDS) {
      const at = firstCells.indexOf(name);
      const g = GROUPS.indexOf(group);
      assert.ok(at > order[g] && (g === GROUPS.length - 1 || at < order[g + 1]), `${name} sits under ${group}`);
    }
  }
});

test('the banner art fits the terminal: full size, then a smaller font, then plain text', async () => {
  const { bannerArt, TAGLINE } = await import('../src/banner.js');
  const widest = (art) => Math.max(...art.split('\n').map((line) => line.length));
  const full = bannerArt(undefined);
  assert.ok(widest(full) <= 200 && full.includes('\n'));
  assert.ok(widest(bannerArt(80)) <= 80);
  for (const columns of [75, 60]) {
    const art = bannerArt(columns);
    assert.ok(widest(art) <= columns && art.includes('\n'), `${columns} columns`);
  }
  assert.equal(bannerArt(10), 'FIRE TV TOOLKIT');
  assert.match(TAGLINE, /Alexa deep-sleep fix/);
});
