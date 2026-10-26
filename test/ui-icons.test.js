import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { prepareUiIcons } from '../src/ui-icons.js';
import { installSharedIcons } from '../src/adb.js';
import { FIRE_TV_UI } from '../src/launcher-registry.js';
import { installLauncherApp } from '../src/apply/launcher.js';
import { installAppUpdate, UI_UPDATE } from '../src/update-releases.js';
import { installFakeAdb } from './helpers/fake-adb.js';
import { launcherFetch } from './helpers/launcher-fakes.js';
import { iconZip, iconPng } from './helpers/ui-icons-fixture.js';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const ip = '192.0.2.5';
const unpinnedUi = {...FIRE_TV_UI,icons:undefined};

function serveIcons(bytes, overrides = {}, downloaded = bytes) {
  const prior = globalThis.fetch;
  const name = `fire-tv-ui-icons-${FIRE_TV_UI.tag.slice(1)}.zip`;
  const base = `https://github.com/${FIRE_TV_UI.repo}/releases/download/${FIRE_TV_UI.tag}/`;
  const sha256 = hash(bytes);
  globalThis.fetch = async url => {
    const value = String(url);
    if (value.startsWith('https://api.github.com/')) return Response.json({tag_name:FIRE_TV_UI.tag,
      assets:[{name,size:bytes.length,digest:`sha256:${sha256}`,browser_download_url:base+name,...overrides},
        {name:`${name}.sha256`,browser_download_url:`${base}${name}.sha256`}]});
    if (value === `${base}${name}.sha256`) return new Response(`${sha256}  ${name}\n`);
    assert.equal(value, base+name);
    return new Response(downloaded);
  };
  return () => { globalThis.fetch = prior; };
}

test('companion archive matches the exact UI tag, handles stored/deflated PNGs and removes private files', async () => {
  for (const method of [0, 8]) {
    const restore = serveIcons(iconZip(undefined, method));
    let prepared;
    try {
      prepared = await prepareUiIcons(unpinnedUi);
      assert.equal(prepared.files.length, 1);
      assert.equal(path.basename(prepared.files[0]), 'pc.png');
      assert.deepEqual(fs.readFileSync(prepared.files[0]), iconPng());
      if (process.platform !== 'win32') assert.equal(fs.statSync(path.dirname(prepared.files[0])).mode & 0o777, 0o700);
    } finally { prepared?.cleanup(); restore(); }
    assert.equal(fs.existsSync(prepared.files[0]), false);
  }
});

test('missing, conflicting or oversized companion metadata is rejected before extraction', async () => {
  for (const overrides of [{size:0}, {size:33*1048576}, {size:iconZip().length+1}, {digest:`sha256:${'0'.repeat(64)}`}, {browser_download_url:'https://github.com/jeremykenedy/fire-tv-ui/releases/download/v0.1.0/old.zip'}]) {
    const restore = serveIcons(iconZip(), overrides);
    try { await assert.rejects(prepareUiIcons(unpinnedUi)); } finally { restore(); }
  }
  const changed = Buffer.from(iconZip());changed[0] ^= 1;
  const restoreCorrupt = serveIcons(iconZip(), {}, changed);
  try { await assert.rejects(prepareUiIcons(unpinnedUi), /SHA-256/); } finally { restoreCorrupt(); }
  const restore = serveIcons(iconZip());
  try {
    await assert.rejects(prepareUiIcons({...FIRE_TV_UI,tag:'../v1.0.0'}), /exact published/);
    await assert.rejects(prepareUiIcons({...FIRE_TV_UI,icons:{tag:FIRE_TV_UI.tag,sha256:'0'.repeat(64),bytes:iconZip().length}}), /disagree/);
  } finally { restore(); }
});

test('unsafe catalog paths, duplicate names, missing ZIP entries and non-HD PNGs never escape the temp directory', async () => {
  const before = fs.readdirSync(os.tmpdir()).filter(name => name.startsWith('firetv-ui-icons-'));
  const cases = [
    {'Icons/catalog.json':JSON.stringify([{file:'../pc.png'}]),'Icons/../pc.png':iconPng()},
    {'Icons/catalog.json':JSON.stringify([{file:'pc.png'},{file:'pc.png'}]),'Icons/pc.png':iconPng()},
    {'Icons/catalog.json':JSON.stringify([{file:'pc.png'}])},
    {'Icons/catalog.json':JSON.stringify([{file:'pc.png'},{file:'bad.png'}]),'Icons/pc.png':iconPng(),'Icons/bad.png':iconPng(400,225)},
  ];
  for (const entries of cases) {
    const restore = serveIcons(iconZip(entries));
    try { await assert.rejects(prepareUiIcons(unpinnedUi)); } finally { restore(); }
  }
  assert.deepEqual(fs.readdirSync(os.tmpdir()).filter(name => name.startsWith('firetv-ui-icons-')), before);
});

test('shared icons are copied and published for the picker without changing Home, grants or unrelated files', async () => {
  const fake = installFakeAdb({files:{'/sdcard/Pictures/other.png':'keep'},uiHomeFlags:{start_on_boot:false},grants:{example:['existing']}});
  const restore = serveIcons(iconZip());
  let prepared;
  try {
    prepared = await prepareUiIcons(unpinnedUi);
    const before = fake.readState();
    assert.equal(await installSharedIcons(ip, prepared.files), 1);
    const after = fake.readState();
    assert.deepEqual(after.secure,before.secure);assert.deepEqual(after.grants,before.grants);
    assert.deepEqual(after.uiHomeFlags,before.uiHomeFlags);assert.deepEqual(after.files,before.files);
    assert.deepEqual(Buffer.from(after.sharedIcons['pc.png'],'base64'),iconPng());
    assert.equal(after.iconMedia['pc.png'].pending,0);
    fake.setState({sdk:28,iconMedia:{}});
    assert.equal(await installSharedIcons(ip,prepared.files),1);
  } finally { prepared?.cleanup();restore();fake.restore(); }
});

test('missing or still-pending media rows fail instead of claiming that icons are available', async () => {
  const fake = installFakeAdb();
  const restore = serveIcons(iconZip());
  let prepared;
  try {
    prepared = await prepareUiIcons(unpinnedUi);
    fake.setState({iconIndexMissing:true});
    await assert.rejects(installSharedIcons(ip,prepared.files),/did not index/);
    fake.setState({iconIndexMissing:false,iconPublishIgnored:true});
    await assert.rejects(installSharedIcons(ip,prepared.files),/not made all/);
  } finally { prepared?.cleanup();restore();fake.restore(); }
});

test('a missing companion blocks UI installation before any device mutation', async () => {
  const fake = installFakeAdb();
  const previous = globalThis.fetch, fetchRelease = launcherFetch();
  globalThis.fetch = async url => {
    const response = await fetchRelease(url);
    if (String(url).startsWith('https://api.github.com/')) {
      const release = await response.json();release.assets = release.assets.filter(asset => asset.name.endsWith('.apk'));
      return Response.json(release);
    }
    return response;
  };
  try {
    const before = fake.readState();
    const result = await installLauncherApp(ip,{...FIRE_TV_UI,sha256:undefined,icons:undefined});
    assert.equal(result.ok,false);assert.match(result.error,/No fire-tv-ui-icons/);
    assert.deepEqual(fake.readState(),before);
  } finally { globalThis.fetch=previous;fake.restore(); }
});

test('failed icon delivery cleans both downloads and never stages a UI update', async () => {
  let cleaned = 0, removed = 0, staged = 0;
  const row={id:UI_UPDATE.id,status:'checked',comparison:1,published:{...UI_UPDATE,checkedAt:Date.now()}};
  await assert.rejects(installAppUpdate(ip,row,{
    downloadApk:async()=>'/checked.apk',inspectApk:()=>({package:UI_UPDATE.pkg,versionCode:70n}),
    packageDetails:async()=>({versionCode:69n}),removeDownload:()=>{removed++;},
    prepareUiIcons:async()=>({files:['/checked/pc.png'],cleanup:()=>{cleaned++;}}),
    installSharedIcons:async()=>{throw new Error('Icon transfer failed');},stageUiUpdate:async()=>{staged++;},
  }),/Icon transfer failed/);
  assert.equal(cleaned,1);assert.equal(removed,1);assert.equal(staged,0);
});
