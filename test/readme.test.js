import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { COMMANDS } from '../src/command-list.js';

const readme = fs.readFileSync(new URL('../README.md', import.meta.url), 'utf8');

test('README links to the complete command reference', () => {
  assert.ok(readme.includes('(docs/COMMANDS.md)'));
  const commands = fs.readFileSync(new URL('../docs/COMMANDS.md', import.meta.url), 'utf8');
  const missing = COMMANDS.map((c) => c.name).filter((name) => !commands.includes(name));
  assert.deepEqual(missing, []);
});

test('README links to a catalog with every screensaver and its repository', async () => {
  assert.ok(readme.includes('(docs/SCREENSAVERS.md)'));
  const { SCREENSAVERS } = await import('../src/screensaver-registry.js');
  const catalog = fs.readFileSync(new URL('../docs/SCREENSAVERS.md', import.meta.url), 'utf8');
  const missing = SCREENSAVERS.filter((s) => !catalog.includes(s.name) || !catalog.includes(`https://github.com/${s.repo}`) || !catalog.includes(`\`${s.id}\``));
  assert.deepEqual(missing.map((s) => s.id), []);
});

test('README links to a gallery with a screenshot of every screensaver', async () => {
  assert.ok(readme.includes('(docs/SCREENSHOTS.md)'));
  const { SCREENSAVERS } = await import('../src/screensaver-registry.js');
  const gallery = fs.readFileSync(new URL('../docs/SCREENSHOTS.md', import.meta.url), 'utf8');
  const missing = SCREENSAVERS.map((s) => `screenshots/screensaver-${s.name.toLowerCase().replaceAll(' ', '-')}.jpg`)
    .filter((file) => !gallery.includes(file) || !fs.existsSync(new URL(`../docs/${file}`, import.meta.url)));
  assert.deepEqual(missing, []);
});

test('the command reference lists every screensaver id for --set', async () => {
  const { SCREENSAVERS } = await import('../src/screensaver-registry.js');
  const commands = fs.readFileSync(new URL('../docs/COMMANDS.md', import.meta.url), 'utf8');
  const setIds = /--set=<([^>]+)>/.exec(commands)[1].split('\\|');
  const missing = SCREENSAVERS.filter((s) => !setIds.includes(s.id) || !commands.includes(`\`${s.id}\``));
  assert.deepEqual(missing.map((s) => s.id), []);
});
