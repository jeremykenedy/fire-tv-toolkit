import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { unzipSync } from 'fflate';

// Official Google Platform Tools 37.0.1 archives, pinned by version and SHA-256.
const archives = {
  darwin: [
    'darwin',
    'ee39ad5967e95c2a07f04dbcbde96b1a0c916ba376096db5d2f498b7727a5d1d',
  ],
  win32: [
    'win',
    '45f4d63113e895ebde0c90f194099a4676b6ac653bd28d54314a9e022bbc1a99',
  ],
  linux: [
    'linux',
    'd230f13842f60f782a8645f9c813f8f845bf36089ea7289f28c48f17979313f1',
  ],
};
const platform = process.argv[2] || process.platform;
if (!archives[platform]) throw new Error(`No bundled adb for ${platform}.`);
const [suffix, checksum] = archives[platform];
const destination = fileURLToPath(new URL('../resources/', import.meta.url));
const temporary = await fs.mkdtemp(
  path.join(os.tmpdir(), 'firetv-platform-tools-'),
);
try {
  const response = await fetch(
    `https://dl.google.com/android/repository/platform-tools_r37.0.1-${suffix}.zip`,
  );
  if (!response.ok)
    throw new Error(`Platform Tools download failed: HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (createHash('sha256').update(bytes).digest('hex') !== checksum) {
    throw new Error(
      'Platform Tools checksum mismatch. No build resources were changed.',
    );
  }
  for (const [name, contents] of Object.entries(unzipSync(bytes))) {
    if (
      !name.startsWith('platform-tools/') ||
      name.includes('\\') ||
      name.split('/').includes('..')
    ) {
      throw new Error('Unexpected path in Platform Tools archive.');
    }
    const target = path.join(temporary, name);
    if (name.endsWith('/')) await fs.mkdir(target, { recursive: true });
    else {
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, contents);
    }
  }
  await fs.mkdir(destination, { recursive: true });
  await fs.rm(path.join(destination, 'platform-tools'), {
    recursive: true,
    force: true,
  });
  await fs.cp(
    path.join(temporary, 'platform-tools'),
    path.join(destination, 'platform-tools'),
    { recursive: true },
  );
  if (platform !== 'win32')
    await fs.chmod(path.join(destination, 'platform-tools', 'adb'), 0o755);
  console.log(`Verified Platform Tools 37.0.1 for ${platform}.`);
} finally {
  await fs.rm(temporary, { recursive: true, force: true });
}
