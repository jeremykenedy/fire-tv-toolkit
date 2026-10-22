import { latestRelease, githubToken, fetchSha256File } from './apply/screensavers.js';
import { packageVersion, packageDetails, installApk, stageUiUpdate } from './adb.js';
import { downloadApk, removeDownload } from './apply/screensavers.js';
import { inspectApk } from './apk-manifest.js';
import { SCREENSAVERS } from './screensaver-registry.js';
import { HOME_LAUNCHERS, HOME_REDIRECT } from './launcher-registry.js';
import { IPTV_APPS } from './iptv-registry.js';

export const UI_UPDATE = Object.freeze({
  id: 'fire-tv-ui', name: 'Fire TV UI', pkg: 'com.jeremykenedy.firetv.ui',
  repo: 'jeremykenedy/fire-tv-ui', asset: 'fire-tv-ui.apk', private: true,
});

/** Version names that cannot be ordered remain unknown, never current. */
export function compareVersions(published, installed) {
  const parse = (value) => {
    if (typeof value !== 'string' || value.length > 64 || !/^v?\d+(\.\d+){0,3}$/.test(value)) return null;
    return value.replace(/^v/, '').split('.').map(BigInt);
  };
  const left = parse(published), right = parse(installed);
  if (!left || !right) return null;
  for (let i = 0; i < Math.max(left.length, right.length); i += 1) {
    if ((left[i] ?? 0n) !== (right[i] ?? 0n)) return (left[i] ?? 0n) > (right[i] ?? 0n) ? 1 : -1;
  }
  return 0;
}

async function publishedChecksum(entry, release, token, api) {
  let sha256 = release.sha256;
  if (release.sha256Url) {
    sha256 = await (api.fetchSha256File ?? fetchSha256File)(
      token ? release.sha256ApiUrl : release.sha256Url, entry.repo, token);
  }
  const digest = /^sha256:([a-f0-9]{64})$/.exec(release.digest ?? '')?.[1];
  if (sha256 && digest && sha256 !== digest) throw new Error('Published checksums disagree.');
  sha256 ||= digest;
  if (!sha256 && entry.tag === release.tag && entry.asset === release.asset) sha256 = entry.sha256;
  if (!/^[a-f0-9]{64}$/.test(sha256 ?? '')) throw new Error(`Published ${release.tag}: no published or matching reviewed SHA-256; installation unavailable.`);
  return sha256;
}

/** Registry pins are installation baselines, not claims about the latest release. */
export async function publishedApk(entry, api = {}) {
  const token = api.token ?? (entry.private ? await (api.githubToken ?? githubToken)() : undefined);
  const release = await (api.latestRelease ?? latestRelease)(entry.repo, entry.asset, undefined, token, true);
  const sha256 = await publishedChecksum(entry, release, token, api);
  if (!Number.isSafeInteger(release.bytes) || release.bytes <= 0 || release.bytes > 250 * 1048576)
    throw new Error('Invalid published APK size.');
  return { ...entry, tag: release.tag, sha256, bytes: release.bytes, url: release.apkUrl,
    asset: release.asset ?? entry.asset, checkedAt: Date.now() };
}

export async function checkAppUpdates(ip, api = {}) {
  const rows = [];
  let token;
  try { token = await (api.githubToken ?? githubToken)(); } catch { /* Public checks can proceed without sign-in. */ }
  let rateLimited = false;
  for (const entry of [UI_UPDATE, ...SCREENSAVERS.filter((item) => item.pkg !== UI_UPDATE.pkg), ...HOME_LAUNCHERS, HOME_REDIRECT, ...IPTV_APPS]) {
    const installed = await (api.packageVersion ?? packageVersion)(ip, entry.pkg);
    if (!installed) continue;
    try {
      if (rateLimited) throw new Error('Not checked: GitHub rate limit paused remaining requests.');
      const published = await publishedApk(entry, { ...api, token });
      rows.push({ id: entry.id, name: entry.name, installed, published,
        comparison: compareVersions(published.tag, installed), status: 'checked' });
    } catch (error) {
      rateLimited ||= /GitHub API returned (403|429)/.test(error.message);
      rows.push({ id: entry.id, name: entry.name, installed, status: 'unavailable', error: error.message });
    }
  }
  return rows;
}

function requireFreshUpdate(row) {
  if (row?.status !== 'checked' || !row.published || !(row.comparison === null || row.comparison > 0))
    throw new Error('Check this installed app and select a newer published release first.');
  if (!Number.isFinite(row.published.checkedAt)
      || Date.now() - row.published.checkedAt > 6 * 3600000 || row.published.checkedAt > Date.now())
    throw new Error('The update check expired. Check again.');
}

async function replaceVerifiedApp(ip, row, apk, api) {
  const archive = (api.inspectApk ?? inspectApk)(apk);
  if (archive.package !== row.published.pkg) throw new Error('APK package differs from the installed app.');
  const before = await (api.packageDetails ?? packageDetails)(ip, row.published.pkg);
  if (before.versionCode === null || archive.versionCode <= before.versionCode)
    throw new Error('APK version code is not newer than the installed app.');
  if (row.id === UI_UPDATE.id) {
    await (api.stageUiUpdate ?? stageUiUpdate)(ip, apk, {
      name: UI_UPDATE.name, package: UI_UPDATE.pkg, repo: UI_UPDATE.repo, dream: '', preview: '',
      tag: row.published.tag, sha256: row.published.sha256, bytes: row.published.bytes,
      url: row.published.url, checked_at: row.published.checkedAt,
    });
    return { staged: true, message: 'Verified private UI update sent. Open Advanced > Updates on the TV and confirm installation.' };
  }
  const output = await (api.installApk ?? installApk)(ip, apk);
  if (!/^Success\b/m.test(output ?? '')) throw new Error('Android did not confirm the replacement install.');
  const after = await (api.packageDetails ?? packageDetails)(ip, row.published.pkg);
  if (after.versionCode !== archive.versionCode)
    throw new Error('The installed version code does not match the verified APK.');
  const installed = after.versionName;
  return { installed, message: 'Installed version verified. Existing app data was retained.' };
}

/** ADB replace installs retain app data; Android enforces the installed signer. */
export async function installAppUpdate(ip, row, api = {}) {
  requireFreshUpdate(row);
  const apk = await (api.downloadApk ?? downloadApk)(row.published);
  try {
    return await replaceVerifiedApp(ip, row, apk, api);
  } finally {
    (api.removeDownload ?? removeDownload)(apk);
  }
}
