import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collectDiagnostics, formatDiagnostics } from '../src/diagnostics.js';

const PKG = 'com.jeremykenedy.firetv.aquarium';

test('diagnostics keeps selected and running dreams separate and reports only installed catalog versions', async () => {
  const calls = [];
  const read = async (ip, args) => {
    assert.equal(ip, '192.0.2.1');
    calls.push(args);
    const command = args.join(' ');
    const results = {
      'settings get secure screensaver_components': `${PKG}/.AquariumDreamService`,
      'dumpsys dreams': 'mCurrentDream=other.package/.Dream\nprivate noise',
      'dumpsys SurfaceFlinger': `Historical stats\n[${PKG}/.Old] 300\n* Layer 0x1 (SurfaceView - ${PKG}/.Dream#0)\n geomBufferSize=[0 0 3840 2160]\n* Layer 0x2 (unrelated.app/.Activity)\n geomBufferSize=[0 0 1920 1080]`,
      'pm list packages': `package:${PKG}\npackage:unrelated.app`,
      [`dumpsys package ${PKG}`]: '  versionCode=2 minSdk=26\n  versionName=1.1\n  private data',
      [`dumpsys activity exit-info ${PKG}`]: 'timestamp=2026-10-16\nreason=4 (APP CRASH)\ntrace=private message',
      [`dumpsys gfxinfo ${PKG}`]: 'Total frames rendered: 100\nJanky frames: 3 (3%)',
    };
    return results[command] || '';
  };
  const report = await collectDiagnostics('192.0.2.1', read);
  const output = formatDiagnostics(report);
  assert.match(output, /Selected screensaver\ncom.jeremykenedy.firetv.aquarium/);
  assert.match(output, /Running dream\nmCurrentDream=other.package/);
  assert.match(output, /Aquarium 4K .*\nversionCode=2 minSdk=26\nversionName=1.1/);
  assert.match(output, /reason=4 \(APP CRASH\)/);
  assert.match(output, /Reported buffer: 3840 x 2160/);
  assert.doesNotMatch(output, /Historical stats|\.Old/);
  assert.match(output, /do not measure OpenGL, Filament or video playback FPS/);
  assert.doesNotMatch(output, /private|unrelated.app/);
  assert.equal(calls.filter((args) => args[0] === 'dumpsys' && args[1] === 'package').length, 1);
  assert.ok(calls.every((args) => ['getprop', 'settings', 'dumpsys', 'cat', 'df', 'pm'].includes(args[0])));
  assert.ok(calls.filter((args) => args[0] === 'settings').every((args) => args[1] === 'get'));
  assert.ok(calls.filter((args) => args[0] === 'pm').every((args) => args.join(' ') === 'pm list packages'));
});

test('surface buffer reads accept BufferQueueLayer format without treating historical stats as live buffers', async () => {
  const report = await collectDiagnostics('192.0.2.1', async (_ip, args) => {
    if (args[1] === 'SurfaceFlinger') return `+ BufferQueueLayer (SurfaceView - ${PKG}/.Dream)\n activeBuffer=[1280x 720: 1,RGBA]\n+ BufferQueueLayer (unrelated.app/.Activity)\n activeBuffer=[1920x1080: 1,RGBA]`;
    return '';
  });
  assert.match(formatDiagnostics(report), /Reported buffer: 1280 x 720/);
  assert.doesNotMatch(formatDiagnostics(report), /unrelated.app/);
});

test('unsupported or failed reads remain unavailable and do not prevent the rest of the report', async () => {
  let reads = 0;
  const report = await collectDiagnostics('192.0.2.1', async (_ip, args) => {
    reads++;
    if (args[0] === 'getprop') throw new Error('offline');
    if (args[0] === 'dumpsys') return 'Permission Denial: protected service';
    if (args[0] === 'pm') return 'package:unrelated.app';
    return '';
  });
  assert.ok(reads >= 10);
  assert.match(formatDiagnostics(report), /Unavailable on this device/);
  assert.match(formatDiagnostics(report), /No catalog screensavers installed/);
  assert.ok(!report.sections.some(({ title }) => title.startsWith('Recent exits')));
});

test('missing package permission is not reported as an empty installation list', async () => {
  const report = await collectDiagnostics('192.0.2.1', async () => 'Permission denied');
  assert.equal(report.sections.find(({ title }) => title === 'Installed screensaver versions').text, 'Unavailable on this device');
});
