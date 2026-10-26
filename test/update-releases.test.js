import test from 'node:test';
import assert from 'node:assert/strict';
import { compareVersions, publishedApk, checkAppUpdates, installAppUpdate, UI_UPDATE } from '../src/update-releases.js';
import { OWNTV } from '../src/iptv-registry.js';
import { HOME_REDIRECT } from '../src/launcher-registry.js';

const sha = 'a'.repeat(64);
const release = {tag:'v2.0.0',sha256:sha,bytes:123,apkUrl:'https://github.com/jeremykenedy/example/releases/download/v2.0.0/example.apk',asset:'example.apk'};
const entry={id:'example',pkg:'example.app',name:'Example',repo:'jeremykenedy/example',tag:'v1.0.0',sha256:'b'.repeat(64)};

test('OwnTV updates select the exact current version APK among multiple assets', async () => {
  const originalFetch = globalThis.fetch;
  const asset = 'OwnTV-v5.3.0.apk';
  const expectedHash = 'c'.repeat(64);
  let tag = 'v5.3.0';
  let names = [OWNTV.asset, 'OwnTV-v5.3.0-arm64.apk', asset];
  globalThis.fetch = async () => Response.json({tag_name: tag,
    body: `SHA-256 (${OWNTV.asset}): ${'b'.repeat(64)}\nSHA-256 (${asset}): ${expectedHash}`,
    assets: names.map(name => ({name, size: 123,
      browser_download_url: `https://github.com/ahXN00/OwnTV/releases/download/v5.3.0/${name}`}))});
  try {
    const result = await publishedApk(OWNTV, {githubToken: async () => undefined});
    assert.equal(result.asset, asset);
    assert.equal(result.sha256, expectedHash);
    names = ['OwnTV-v5.3.0-arm64.apk'];
    await assert.rejects(publishedApk(OWNTV, {githubToken: async () => undefined}), /No OwnTV-v5.3.0.apk/);
    tag = '../v5.3.0';
    await assert.rejects(publishedApk(OWNTV, {githubToken: async () => undefined}), /Invalid versioned APK asset/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('published update lookup ignores catalog tag/hash and authenticates private lookups',async()=>{
  let args;
  const result=await publishedApk({...entry,private:true},{githubToken:async()=> 'ephemeral',latestRelease:async(...a)=>{args=a;return release;}});
  assert.equal(args[2],undefined);
  assert.equal(args[3],'ephemeral');
  assert.equal(result.tag,'v2.0.0');
  assert.equal(result.sha256,sha);
  assert.equal(result.token,undefined);
});

test('version comparison preserves unknown and installed-newer states',()=>{
  assert.equal(compareVersions('v1.2.0','1.2'),0);
  assert.equal(compareVersions('1.3','1.2'),1);
  assert.equal(compareVersions('1.1','1.2'),-1);
  for(const value of ['mirror','1.2-beta',null,'x'.repeat(65)])assert.equal(compareVersions(value,'1.2'),null);
});

test('invalid or conflicting published integrity is unavailable',async()=>{
  for(const value of [{...release,sha256:null},{...release,bytes:0},{...release,digest:`sha256:${'b'.repeat(64)}`}])
    await assert.rejects(publishedApk(entry,{latestRelease:async()=>value}));
});

test('failed checks stay unavailable rather than up to date',async()=>{
  const rows=await checkAppUpdates('192.0.2.2',{packageVersion:async(_ip,pkg)=>pkg===UI_UPDATE.pkg?'1.3.3':null,
    githubToken:async()=>{throw new Error('Sign in required');},
    latestRelease:async()=>{throw new Error('GitHub API returned 503');}});
  assert.equal(rows.length,1);assert.equal(rows[0].status,'unavailable');assert.equal(rows[0].published,undefined);
});

test('public UI releases remain available without GitHub authentication', async () => {
  const rows = await checkAppUpdates('192.0.2.2', {
    packageVersion: async (_ip, pkg) => pkg === UI_UPDATE.pkg ? '1.8.0' : null,
    githubToken: async () => { throw new Error('GitHub sign-in unavailable'); },
    latestRelease: async (repo, asset, tag, token) => {
      assert.equal(repo, UI_UPDATE.repo);
      assert.equal(asset, 'fire-tv-ui.apk');
      assert.equal(tag, undefined);
      assert.equal(token, undefined);
      return { ...release, tag: 'v1.9.0', asset: 'fire-tv-ui.apk' };
    },
  });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].status, 'checked');
  assert.equal(rows[0].comparison, 1);
  assert.equal(rows[0].published.tag, 'v1.9.0');
});

test('UI update sends only reviewed metadata, never directly installs',async()=>{
  let sent,removed=false;
  const row={id:'fire-tv-ui',status:'checked',comparison:1,published:{...UI_UPDATE,...release,url:release.apkUrl,checkedAt:Date.now()}};
  const result=await installAppUpdate('192.0.2.2',row,{downloadApk:async()=>'/private/apk',
    inspectApk:()=>({package:UI_UPDATE.pkg,versionCode:38n}), packageDetails:async()=>({versionCode:37n}),
    stageUiUpdate:async(ip,apk,metadata)=>{sent={ip,apk,metadata};},
    installApk:async()=>{throw new Error('Must not install UI silently');},removeDownload:()=>{removed=true;}});
  assert.equal(result.staged,true);assert.equal(sent.ip,'192.0.2.2');assert.equal(sent.metadata.package,UI_UPDATE.pkg);
  assert.equal(sent.metadata.checked_at,row.published.checkedAt);assert.equal(removed,true);
  assert.deepEqual(Object.keys(sent.metadata).sort(),['bytes','checked_at','dream','name','package','preview','repo','sha256','tag','url']);
});

test('install errors clean downloads and are never installation success',async()=>{
  let removed=0;
  const row={id:'example',status:'checked',comparison:1,published:{...entry,...release,checkedAt:Date.now()}};
  const api={inspectApk:()=>({package:entry.pkg,versionCode:2n}),packageDetails:async()=>({versionCode:1n}),downloadApk:async()=>'/private/apk',removeDownload:()=>{removed++;},installApk:async()=> 'Failure [certificate mismatch]'};
  await assert.rejects(installAppUpdate('192.0.2.2',row,api),/did not confirm/);assert.equal(removed,1);
  await assert.rejects(installAppUpdate('192.0.2.2',{...row,comparison:0},api),/newer/);
  row.published.checkedAt-=7*3600000;
  await assert.rejects(installAppUpdate('192.0.2.2',row,api),/expired/);
});

test('replacement verifies package, numeric version code and observed installed result', async () => {
  const row = {id:'example',status:'checked',comparison:1,published:{...entry,...release,checkedAt:Date.now()}};
  let downloaded = 0, removed = 0, installed = 0;
  const api = {
    downloadApk:async()=>{downloaded++;return '/checked.apk';},removeDownload:()=>{removed++;},
    inspectApk:()=>({package:entry.pkg,versionCode:2n}),
    packageDetails:async()=>({versionCode:installed ? 2n : 1n,versionName:installed ? '2.0.0' : '1.0.0'}),
    installApk:async()=>{installed++;return 'Success\n';},
  };
  for (const checkedAt of [undefined,NaN,Infinity,Date.now()+60000]) {
    await assert.rejects(installAppUpdate('192.0.2.2',{...row,published:{...row.published,checkedAt}},api),/expired/);
  }
  assert.equal(downloaded,0);
  await assert.rejects(installAppUpdate('192.0.2.2',row,{...api,inspectApk:()=>({package:'other.app',versionCode:2n})}),/package differs/);
  await assert.rejects(installAppUpdate('192.0.2.2',row,{...api,inspectApk:()=>({package:entry.pkg,versionCode:1n})}),/not newer/);
  await assert.rejects(installAppUpdate('192.0.2.2',row,{...api,packageDetails:async()=>({versionCode:null})}),/not newer/);
  assert.equal(installed,0);
  assert.equal(removed,3);
  const result=await installAppUpdate('192.0.2.2',row,api);
  assert.equal(result.installed,'2.0.0');
  assert.equal(installed,1);
  assert.equal(removed,4);
  installed=0;
  await assert.rejects(installAppUpdate('192.0.2.2',row,{...api,packageDetails:async()=>({versionCode:1n})}),/does not match/);
  assert.equal(removed,5);
});

test('a rate limited check pauses remaining publishers while retaining installed app visibility', async()=>{
  let lookups=0;
  const rows=await checkAppUpdates('192.0.2.2',{
    packageVersion:async()=> '1.0.0',githubToken:async()=> 'ephemeral',
    latestRelease:async()=>{lookups++;throw new Error('GitHub API returned 429');},
  });
  assert.equal(lookups,1);
  assert.ok(rows.length>30);
  assert.ok(rows.every(row=>row.status==='unavailable'&&!row.published));
  assert.match(rows.at(-1).error,/rate limit/);
});

test('published sidecars and matching reviewed pins are verified without copying credentials',async()=>{
  let requested;
  const actual={...release,sha256:null,sha256Url:'https://github.com/jeremykenedy/example/releases/download/v2.0.0/example.apk.sha256',sha256ApiUrl:'https://api.github.com/repos/jeremykenedy/example/releases/assets/2'};
  const verified=await publishedApk(entry,{token:'ephemeral',latestRelease:async()=>actual,
    fetchSha256File:async(...args)=>{requested=args;return sha;}});
  assert.equal(verified.sha256,sha);
  assert.deepEqual(requested,[actual.sha256ApiUrl,entry.repo,'ephemeral']);
  assert.equal(verified.token,undefined);
  const pinned={...entry,tag:release.tag,asset:release.asset,sha256:sha};
  assert.equal((await publishedApk(pinned,{latestRelease:async()=>({...release,sha256:null})})).sha256,sha);
  await assert.rejects(publishedApk({...pinned,tag:'v1.0.0'},{latestRelease:async()=>({...release,sha256:null})}),/no published/);
  await assert.rejects(publishedApk(entry,{latestRelease:async()=>({...actual,digest:`sha256:${'b'.repeat(64)}`}),
    fetchSha256File:async()=>sha}),/disagree/);
});

test('successful checks retain unavailable publishers and unknown version names independently',async()=>{
  const rows=await checkAppUpdates('192.0.2.2',{
    packageVersion:async(_ip,pkg)=>pkg===UI_UPDATE.pkg ? 'mirror' : pkg===entry.pkg ? '1.0.0' : null,
    githubToken:async()=> 'ephemeral',latestRelease:async()=>release,
  });
  assert.equal(rows.length,1);
  assert.equal(rows[0].status,'checked');
  assert.equal(rows[0].comparison,null);
  assert.equal(rows[0].published.tag,'v2.0.0');
});


test('Home Redirect checks its latest exact stable Android asset across desktop-only releases', async () => {
  const originalFetch = globalThis.fetch;
  const seen = [];
  const asset = {name: HOME_REDIRECT.asset, size: 123, digest: 'sha256:' + sha,
    browser_download_url: 'https://github.com/jeremykenedy/fire-tv-toolkit/releases/download/v3.9.1/firetv-home-redirect.apk'};
  globalThis.fetch = async url => {
    seen.push(url);
    if (url.endsWith('/latest')) return Response.json({tag_name: 'v4.4.0', assets: [
      {name: 'another-app.apk', size: 100, digest: 'sha256:' + 'b'.repeat(64)}]});
    assert.equal(url, 'https://api.github.com/repos/jeremykenedy/fire-tv-toolkit/releases?per_page=100');
    return Response.json([
      {tag_name: 'v4.5.0-beta', published_at: '2026-10-23T00:00:00Z', prerelease: true, assets: [asset]},
      {tag_name: 'v4.3.2', assets: []},
      {tag_name: 'v3.8.0', published_at: '2026-10-19T00:00:00Z', assets: [asset]},
      {tag_name: 'v3.9.1', published_at: '2026-10-20T00:00:00Z', assets: [asset]},
    ]);
  };
  try {
    const result = await publishedApk(HOME_REDIRECT, {
      githubToken: async () => undefined,
      downloadApk: async () => '/private/helper.apk',
      inspectApk: () => ({package: HOME_REDIRECT.pkg, versionCode: 10n, versionName: '1.2.6'}),
      removeDownload: () => {},
    });
    assert.equal(result.tag, 'v3.9.1');
    assert.equal(result.asset, HOME_REDIRECT.asset);
    assert.equal(result.packageVersionCode, '10');
    assert.equal(result.packageVersionName, '1.2.6');
    assert.equal(seen.length, 2);
  } finally { globalThis.fetch = originalFetch; }
});


test('Home Redirect compares Android codes rather than the Toolkit release version', async () => {
  let installedCode = 125n;
  let removed = 0;
  let inspectedPackage = HOME_REDIRECT.pkg;
  const api = {
    packageVersion: async (_ip, pkg) => pkg === HOME_REDIRECT.pkg ? '1.2.5' : null,
    packageDetails: async () => ({versionCode: installedCode}),
    githubToken: async () => undefined,
    latestRelease: async () => ({...release, tag: 'v3.9.1', asset: HOME_REDIRECT.asset}),
    downloadApk: async () => '/private/helper.apk',
    inspectApk: () => ({package: inspectedPackage, versionCode: 125n, versionName: '1.2.5'}),
    removeDownload: () => { removed++; },
  };
  for (const [code, comparison] of [[125n, 0], [124n, 1], [126n, -1]]) {
    installedCode = code;
    const rows = await checkAppUpdates('192.0.2.2', api);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].comparison, comparison);
    assert.equal(rows[0].published.packageVersionName, '1.2.5');
  }
  inspectedPackage = 'unrelated.app';
  const rejected = await checkAppUpdates('192.0.2.2', api);
  assert.equal(rejected[0].status, 'unavailable');
  assert.equal(rejected[0].published, undefined);
  assert.equal(removed, 4);
});
