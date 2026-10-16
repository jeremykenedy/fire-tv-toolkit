import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import test from 'node:test';
import { runTvShell } from '../tv-shell.js';

function execute(program, options = {}) {
  const output = [];
  const pending = runTvShell(
    '/bundled/adb',
    '192.168.1.10',
    'id; echo "$PATH"',
    {
      signal: new AbortController().signal,
      onOutput: (chunk) => output.push(chunk),
      spawnProcess: (executable, args, settings) => {
        assert.equal(executable, '/bundled/adb');
        assert.deepEqual(args, [
          '-s',
          '192.168.1.10:5555',
          'shell',
          '-T',
          'id; echo "$PATH"',
        ]);
        assert.equal(settings.shell, undefined);
        return spawn(process.execPath, ['-e', program], settings);
      },
      ...options,
    },
  );
  return { pending, output };
}

test('TV shell streams stdout and stderr and preserves a nonzero exit', async () => {
  const { pending, output } = execute(
    'process.stdout.write("model\\n"); process.stderr.write("denied\\n"); process.exitCode = 7;',
  );
  const result = await pending;
  assert.equal(result.code, 7);
  assert.equal(result.stopped, null);
  assert.equal(
    output
      .filter((chunk) => chunk.stream === 'stdout')
      .map((chunk) => chunk.text)
      .join(''),
    'model\n',
  );
  assert.equal(
    output
      .filter((chunk) => chunk.stream === 'stderr')
      .map((chunk) => chunk.text)
      .join(''),
    'denied\n',
  );
});

test('TV shell bounds output, times out and supports cancellation', async (t) => {
  await t.test('output limit', async () => {
    const { pending, output } = execute(
      'process.stdout.write("x".repeat(300000)); setInterval(() => {}, 1000);',
    );
    assert.equal((await pending).stopped, 'output-limit');
    assert.equal(
      output.reduce((bytes, chunk) => bytes + Buffer.byteLength(chunk.text), 0),
      262144,
    );
  });
  await t.test('timeout', async () => {
    const { pending } = execute('setInterval(() => {}, 1000);', {
      timeout: 40,
    });
    assert.equal((await pending).stopped, 'timeout');
  });
  await t.test('cancel', async () => {
    const abort = new AbortController();
    const { pending } = execute('setInterval(() => {}, 1000);', {
      signal: abort.signal,
    });
    abort.abort();
    assert.equal((await pending).stopped, 'stopped');
  });
});

test('a missing ADB executable reports an error and releases the timeout', async () => {
  await assert.rejects(
    runTvShell('/missing/adb', '192.168.1.10', 'id', {
      signal: new AbortController().signal,
      onOutput: () => {},
    }),
    /ENOENT/,
  );
});
