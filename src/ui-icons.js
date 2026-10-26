import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { latestRelease, fetchSha256File, fetchTrusted, assertTrustedApkUrl } from './apply/screensavers.js';
import { readZipEntry } from './apk-manifest.js';

const REPO = 'jeremykenedy/fire-tv-ui';
const MAX_ARCHIVE = 32 * 1048576;
const PNG_HEADER = Buffer.from('89504e470d0a1a0a', 'hex');

async function archiveBytes(response, expectedSize) {
  if (!response.ok || !response.body) throw new Error(`Downloading UI icons failed with status ${response.status}.`);
  const chunks = [];
  let size = 0;
  for await (const chunk of response.body) {
    size += chunk.length;
    if (size > expectedSize) throw new Error('UI icon archive exceeds its published size.');
    chunks.push(Buffer.from(chunk));
  }
  if (size !== expectedSize) throw new Error('UI icon archive differs from its published size.');
  return Buffer.concat(chunks);
}

/** Verifies the same release's companion icons before any TV writes. */
export async function prepareUiIcons(app) {
  if (app.repo !== REPO || !/^v\d+\.\d+\.\d+$/.test(app.tag ?? ''))
    throw new Error('UI icons require an exact published UI release tag.');
  const asset = `fire-tv-ui-icons-${app.tag.slice(1)}.zip`;
  const release = await latestRelease(REPO, asset, app.tag);
  const url = `https://github.com/${REPO}/releases/download/${app.tag}/${asset}`;
  if (release.tag !== app.tag || !Number.isSafeInteger(release.bytes)
      || release.bytes <= 0 || release.bytes > MAX_ARCHIVE
      || release.apkUrl !== url || release.sha256Url !== `${url}.sha256`)
    throw new Error('The matching UI icon archive or checksum is unavailable.');
  assertTrustedApkUrl(release.apkUrl, REPO);
  const checksum = await fetchSha256File(release.sha256Url, REPO);
  if (!/^[a-f0-9]{64}$/.test(checksum ?? '')) throw new Error('The UI icon checksum is invalid.');
  const reviewed = app.icons?.tag === app.tag ? app.icons : null;
  const digest = /^sha256:([a-f0-9]{64})$/.exec(release.digest ?? '')?.[1];
  if ((digest && digest !== checksum) || (reviewed && (reviewed.sha256 !== checksum || reviewed.bytes !== release.bytes)))
    throw new Error('Published and reviewed UI icon checksums or sizes disagree.');
  const bytes = await archiveBytes(await fetchTrusted(release.apkUrl), release.bytes);
  if (createHash('sha256').update(bytes).digest('hex') !== checksum)
    throw new Error('The UI icon archive failed its SHA-256 check.');
  const catalog = JSON.parse(readZipEntry(bytes, 'Icons/catalog.json', 256 * 1024).toString('utf8'));
  if (!Array.isArray(catalog) || catalog.length === 0 || catalog.length > 128)
    throw new Error('The UI icon catalog is invalid.');
  const names = catalog.map(item => item?.file);
  if (new Set(names).size !== names.length || names.some(name => typeof name !== 'string' || !/^[a-z0-9-]+\.png$/.test(name)))
    throw new Error('The UI icon catalog contains unsafe or duplicate filenames.');
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'firetv-ui-icons-'));
  fs.chmodSync(folder, 0o700);
  const cleanup = () => fs.rmSync(folder, { recursive: true, force: true });
  try {
    let total = 0;
    const files = names.map(name => {
      const png = readZipEntry(bytes, `Icons/${name}`, 16 * 1048576);
      total += png.length;
      if (total > 64 * 1048576 || png.length < 24 || !png.subarray(0, 8).equals(PNG_HEADER)
          || png.toString('ascii', 12, 16) !== 'IHDR' || png.readUInt32BE(16) !== 1920 || png.readUInt32BE(20) !== 1080)
        throw new Error(`UI icon is not a full HD PNG: ${name}`);
      const file = path.join(folder, name);
      fs.writeFileSync(file, png, { mode: 0o600, flag: 'wx' });
      return file;
    });
    return { files, cleanup };
  } catch (error) {
    cleanup();
    throw error;
  }
}
