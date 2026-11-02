import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const TIMEOUT = 15000;

/** Locate the Android SDK build tools, not a path supplied by an artifact contract. */
function sdkRoots() {
  const home = os.homedir();
  return [...new Set([
    process.env.ANDROID_SDK_ROOT, process.env.ANDROID_HOME,
    path.join(home, 'Library', 'Android', 'sdk'), path.join(home, 'Android', 'Sdk'),
    path.join(home, 'AppData', 'Local', 'Android', 'Sdk'),
  ].filter(value => typeof value === 'string' && path.isAbsolute(value)))];
}

function findSigner(roots = sdkRoots(), platform = process.platform) {
  for (const root of roots) {
    const tools = path.join(root, 'build-tools');
    let versions;
    try { versions = fs.readdirSync(tools).filter(name => /^\d+\.\d+\.\d+$/.test(name)); }
    catch { continue; }
    versions.sort((a, b) => {
      const left = a.split('.').map(Number), right = b.split('.').map(Number);
      return right[0] - left[0] || right[1] - left[1] || right[2] - left[2];
    });
    for (const version of versions) {
      const dir = path.join(tools, version);
      const executable = platform === 'win32' ? path.join(dir, 'lib', 'apksigner.jar') : path.join(dir, 'apksigner');
      try { if (fs.statSync(executable).isFile()) return { executable, java: platform === 'win32' }; }
      catch { /* Try another installed build-tools version. */ }
    }
  }
  return null;
}

/** The verifier runs only on a private copy whose bytes already matched the contract. */
export function verifyApkSigner(apk, expected, options = {}) {
  const signer = findSigner(options.roots, options.platform);
  if (!signer) return { status: 'unavailable' };
  const execute = options.execute ?? execFileSync;
  const command = signer.java ? 'java' : signer.executable;
  const args = signer.java
    ? ['-jar', signer.executable, 'verify', '--print-certs', apk]
    : ['verify', '--print-certs', apk];
  let output;
  try {
    output = execute(command, args, { encoding: 'utf8', timeout: TIMEOUT, maxBuffer: 65536, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (error) {
    const details = `${error?.stderr ?? ''} ${error?.message ?? ''}`;
    if (['ENOENT', 'EACCES', 'ETIMEDOUT'].includes(error?.code) || error?.signal
        || /java.*(not found|not recognized|no such file|unable to locate)|unable to (access jarfile|locate.*java)|could not find or load main class/i.test(details))
      return { status: 'unavailable' };
    return { status: 'invalid' };
  }
  const certificates = [...String(output).matchAll(/^Signer #(\d+) certificate SHA-256 digest:\s*([a-fA-F0-9]{64})\s*$/gm)];
  if (certificates.length !== 1 || certificates[0][1] !== '1') return { status: 'invalid' };
  const actual = certificates[0][2].toLowerCase();
  return { status: actual === expected ? 'verified' : 'mismatch', signerSha256: actual };
}
