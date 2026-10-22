import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';
import { compareVersions } from './update-releases.js';
import { fetchTrusted, assertTrustedApkUrl } from './apply/screensavers.js';

const execute = promisify(execFile);
const ROOT = fileURLToPath(new URL('../', import.meta.url));
const REPO = 'jeremykenedy/fire-tv-toolkit';

export function desktopAsset(platform, arch) {
  const names = {darwin: 'mac',win32: 'win',linux: 'linux'};
  if (!names[platform] || !['x64','arm64'].includes(arch)) throw new Error('No reviewed desktop installer for this platform.');
  const cpu = platform === 'linux' && arch === 'x64' ? 'x86_64' : arch;
  const extension = platform === 'darwin' ? 'dmg' : platform === 'win32' ? 'exe' : 'AppImage';
  return `Fire-TV-Toolkit-${names[platform]}-${cpu}.${extension}`;
}

export async function checkToolkitUpdate({fetchRelease = fetch, root = ROOT} = {}) {
  const response = await fetchRelease(`https://api.github.com/repos/${REPO}/releases/latest`,
    {redirect:'error',signal:AbortSignal.timeout(15000)});
  if (!response.ok) throw new Error(`Toolkit update check unavailable: GitHub ${response.status}.`);
  const release = await response.json();
  if (release.draft || release.prerelease || !/^v\d+\.\d+\.\d+$/.test(release.tag_name ?? ''))
    throw new Error('No stable published Toolkit release was verified.');
  const installed = JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')).version;
  return {installed,tag:release.tag_name,comparison:compareVersions(release.tag_name,installed),
    checkedAt:Date.now(),assets:release.assets ?? []};
}

function fresh(update) {
  if (!update || update.comparison !== 1 || !/^v\d+\.\d+\.\d+$/.test(update.tag ?? '')
      || !Number.isFinite(update.checkedAt) || update.checkedAt > Date.now()
      || Date.now()-update.checkedAt > 6*3600000) throw new Error('Check a newer published Toolkit release first.');
}

/** A clean primary checkout updates in place; ignored local TV configuration stays in place. */
export async function installCliUpdate(update, {root = ROOT, run = execute} = {}) {
  fresh(update);
  const git = async (...args) => (await run('git',args,{cwd:root,timeout:60000})).stdout.trim();
  if (await git('status','--porcelain')) throw new Error('Local changes were preserved. Commit or move them before updating Toolkit.');
  if (await git('branch','--show-current') !== 'main') throw new Error('Toolkit self-update requires its main branch. Your checkout was preserved.');
  const origin = await git('remote','get-url','origin');
  if (!['https://github.com/jeremykenedy/fire-tv-toolkit.git','git@github.com:jeremykenedy/fire-tv-toolkit.git'].includes(origin))
    throw new Error('Toolkit origin is not the reviewed repository.');
  await git('fetch','origin','main','--tags');
  const commit = await git('rev-parse',`${update.tag}^{commit}`);
  await git('merge-base','--is-ancestor',commit,'refs/remotes/origin/main');
  await git('merge','--ff-only',commit);
  await run(process.platform === 'win32' ? 'npm.cmd' : 'npm',['ci'],{cwd:root,timeout:180000});
  await run(process.platform === 'win32' ? 'npm.cmd' : 'npm',['link'],{cwd:root,timeout:60000});
  const installed = JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')).version;
  if (compareVersions(update.tag,installed)!==0) throw new Error('Toolkit replacement version was not verified.');
  return {installed,message:'Toolkit CLI updated. Saved TV configuration was retained.'};
}

export async function downloadDesktopUpdate(update, {platform=process.platform,arch=process.arch,
  fetchAsset=fetchTrusted} = {}) {
  fresh(update);
  const name=desktopAsset(platform,arch);
  const asset=update.assets.find(item=>item.name===name);
  const sums=update.assets.find(item=>item.name==='SHA256SUMS');
  if(!asset||!sums)throw new Error('This published release has no installer and checksum for your platform.');
  for(const item of [asset,sums])assertTrustedApkUrl(item.browser_download_url,REPO);
  if(!Number.isSafeInteger(asset.size)||asset.size<=0||asset.size>350*1048576)
    throw new Error('Invalid desktop installer size.');
  const checksumResponse=await fetchAsset(sums.browser_download_url);
  if(!checksumResponse.ok)throw new Error('The installer checksum could not be read.');
  const text=await checksumResponse.text();
  if(text.length>65536)throw new Error('Installer checksum list is too large.');
  const hashes=text.split('\n').map(line=>/^([a-f0-9]{64})\s+\*?(.+)$/.exec(line.trim()))
    .filter(match=>match&&match[2]===name).map(match=>match[1]);
  if(hashes.length!==1)throw new Error('No unique published checksum for this installer.');
  const response=await fetchAsset(asset.browser_download_url);
  if(!response.ok)throw new Error('Desktop installer download failed.');
  const bytes=Buffer.from(await response.arrayBuffer());
  if(bytes.length!==asset.size||createHash('sha256').update(bytes).digest('hex')!==hashes[0])
    throw new Error('Desktop installer did not match its published checksum and size.');
  const folder=fs.mkdtempSync(path.join(os.tmpdir(),'firetv-desktop-update-'));
  const file=path.join(folder,name);fs.writeFileSync(file,bytes,{mode:0o700});
  return {file,message:'Verified installer downloaded. Complete the operating-system installation, then reopen Toolkit to verify its version. Settings are retained.'};
}
