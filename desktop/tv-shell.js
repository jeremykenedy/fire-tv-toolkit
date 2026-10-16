import { spawn } from 'node:child_process';

const MAX_OUTPUT = 256 * 1024;
const TIMEOUT_MS = 60_000;

export function runTvShell(
  executable,
  ip,
  command,
  { signal, onOutput, spawnProcess = spawn, timeout = TIMEOUT_MS },
) {
  return new Promise((resolve, reject) => {
    const child = spawnProcess(
      executable,
      ['-s', `${ip}:5555`, 'shell', '-T', command],
      {
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );
    let bytes = 0;
    let stopped = null;
    function stop(reason) {
      if (stopped) return;
      stopped = reason;
      child.kill();
    }
    const cancel = () => stop('stopped');
    signal.addEventListener('abort', cancel, { once: true });
    if (signal.aborted) cancel();
    const timer = setTimeout(() => stop('timeout'), timeout);
    for (const [stream, name] of [
      [child.stdout, 'stdout'],
      [child.stderr, 'stderr'],
    ]) {
      stream.setEncoding('utf8');
      stream.on('data', (text) => {
        if (stopped) return;
        const remaining = MAX_OUTPUT - bytes;
        const chunk = Buffer.from(text).subarray(0, remaining);
        bytes += chunk.length;
        if (chunk.length)
          onOutput({ stream: name, text: chunk.toString('utf8') });
        if (bytes >= MAX_OUTPUT) stop('output-limit');
      });
    }
    function cleanup() {
      clearTimeout(timer);
      signal.removeEventListener('abort', cancel);
    }
    child.once('error', (error) => {
      cleanup();
      reject(error);
    });
    child.once('close', (code, exitSignal) => {
      cleanup();
      resolve({ code, signal: exitSignal, stopped });
    });
  });
}
