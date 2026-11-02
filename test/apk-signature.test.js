import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { verifyApkSigner } from '../src/apk-signature.js';

function sdk() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'firetv-signer-test-'));
  const dir = path.join(root, 'build-tools', '36.0.0');
  fs.mkdirSync(path.join(dir, 'lib'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'apksigner'), '');
  fs.writeFileSync(path.join(dir, 'lib', 'apksigner.jar'), '');
  return root;
}
const digest = 'a'.repeat(64);
const output = value => `Signer #1 certificate SHA-256 digest: ${value}\n`;

test('verifier binds the expected signer and passes APK path as a literal argument', t => {
  const root = sdk(); t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  let invocation;
  const result = verifyApkSigner('/tmp/a $(touch never).apk', digest, { roots: [root], platform: 'linux',
    execute: (command, args, options) => { invocation = { command, args, options }; return output(digest); } });
  assert.equal(result.status, 'verified');
  assert.deepEqual(invocation.args, ['verify', '--print-certs', '/tmp/a $(touch never).apk']);
  assert.equal(invocation.command, path.join(root, 'build-tools', '36.0.0', 'apksigner'));
  assert.equal(invocation.options.timeout, 15000);
  assert.equal(invocation.options.shell, undefined);
});

test('other signer, multiple signers and invalid signature cannot verify', t => {
  const root = sdk(); t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const options = { roots: [root], platform: 'linux' };
  assert.equal(verifyApkSigner('x.apk', digest, { ...options, execute: () => output('b'.repeat(64)) }).status, 'mismatch');
  assert.equal(verifyApkSigner('x.apk', digest, { ...options, execute: () => output(digest) + `Signer #2 certificate SHA-256 digest: ${digest}\n` }).status, 'invalid');
  assert.equal(verifyApkSigner('x.apk', digest, { ...options, execute: () => { throw Object.assign(new Error('bad signature'), { status: 1 }); } }).status, 'invalid');
  assert.equal(verifyApkSigner('x.apk', digest, { ...options, execute: () => 'Verified' }).status, 'invalid');
});

test('missing or timed-out tooling stays unavailable and Windows uses Java without a shell', t => {
  const root = sdk(); t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  assert.equal(verifyApkSigner('x.apk', digest, { roots: [], platform: 'linux' }).status, 'unavailable');
  assert.equal(verifyApkSigner('x.apk', digest, { roots: [root], platform: 'linux', execute: () => { throw Object.assign(new Error('timeout'), { signal: 'SIGTERM' }); } }).status, 'unavailable');
  let invocation;
  assert.equal(verifyApkSigner('x.apk', digest, { roots: [root], platform: 'win32', execute: (command, args, options) => {
    invocation = { command, args, options }; return output(digest);
  }}).status, 'verified');
  assert.equal(invocation.command, 'java');
  assert.deepEqual(invocation.args, ['-jar', path.join(root, 'build-tools', '36.0.0', 'lib', 'apksigner.jar'), 'verify', '--print-certs', 'x.apk']);
  assert.equal(invocation.options.shell, undefined);
});
