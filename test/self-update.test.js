import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import {checkToolkitUpdate,installCliUpdate,downloadDesktopUpdate,desktopAsset} from '../src/self-update.js';

const release=()=>({tag:'v4.4.0',comparison:1,checkedAt:Date.now()});
test('self-check labels errors as unavailable and rejects unpublished releases',async()=>{
  await assert.rejects(checkToolkitUpdate({fetchRelease:async()=>({ok:false,status:403})}),/unavailable/);
  for(const value of [{draft:true},{prerelease:true},{tag_name:'feature'}])
    await assert.rejects(checkToolkitUpdate({fetchRelease:async()=>({ok:true,json:async()=>value})}));
});
test('CLI self-update preserves dirty or foreign checkouts and updates only a verified primary tag',async()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'toolkit-self-test-'));
  fs.writeFileSync(path.join(root,'package.json'),JSON.stringify({version:'4.3.2'}));
  let dirty=true,calls=[];
  const run=async(command,args)=>{
    calls.push([command,...args]);
    if(args[0]==='status')return {stdout:dirty?' M local-change':''};
    if(args[0]==='branch')return {stdout:'main'};
    if(args[0]==='remote')return {stdout:'https://github.com/jeremykenedy/fire-tv-toolkit.git'};
    if(args[0]==='rev-parse')return {stdout:'a'.repeat(40)};
    if(args[0]==='link')fs.writeFileSync(path.join(root,'package.json'),JSON.stringify({version:'4.4.0'}));
    return {stdout:''};
  };
  try{
    await assert.rejects(installCliUpdate(release(),{root,run}),/Local changes/);
    assert.equal(calls.some(call=>call.includes('fetch')),false);
    dirty=false;calls=[];
    assert.equal((await installCliUpdate(release(),{root,run})).installed,'4.4.0');
    assert.ok(calls.some(call=>call.includes('merge-base')&&call.includes('refs/remotes/origin/main')));
    assert.ok(calls.some(call=>call.includes('--ff-only')));
    assert.equal(calls.some(call=>call.includes('reset')||call.includes('clean')),false);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('desktop update downloads only matching platform release with published hash',async()=>{
  assert.equal(desktopAsset('darwin','arm64'),'Fire-TV-Toolkit-mac-arm64.dmg');
  assert.throws(()=>desktopAsset('win32','ia32'));
  const bytes=Buffer.from('verified installer');
  const name=desktopAsset('darwin','arm64');
  const url=file=>`https://github.com/jeremykenedy/fire-tv-toolkit/releases/download/v4.4.0/${file}`;
  const update={...release(),assets:[{name,size:bytes.length,browser_download_url:url(name)},
    {name:'SHA256SUMS',browser_download_url:url('SHA256SUMS')}]};
  let hash=createHash('sha256').update(bytes).digest('hex');
  const fetchAsset=async()=>({ok:true,text:async()=>`${hash}  ${name}\n`,arrayBuffer:async()=>bytes});
  const result=await downloadDesktopUpdate(update,{platform:'darwin',arch:'arm64',fetchAsset});
  try{assert.deepEqual(fs.readFileSync(result.file),bytes);}finally{fs.rmSync(path.dirname(result.file),{recursive:true,force:true});}
  hash='0'.repeat(64);
  await assert.rejects(downloadDesktopUpdate(update,{platform:'darwin',arch:'arm64',fetchAsset}),/checksum/);
});

test('self-update refuses stale checks, foreign branches and unverified replacement results', async()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'toolkit-update-boundaries-'));
  fs.writeFileSync(path.join(root,'package.json'),JSON.stringify({version:'4.3.2'}));
  let branch='feature', origin='https://github.com/jeremykenedy/fire-tv-toolkit.git';
  let fetched=false;
  const run=async(_command,args)=>{
    if(args[0]==='branch')return {stdout:branch};
    if(args[0]==='remote')return {stdout:origin};
    if(args[0]==='fetch')fetched=true;
    if(args[0]==='rev-parse')return {stdout:'a'.repeat(40)};
    return {stdout:''};
  };
  try{
    for(const value of [null,{...release(),comparison:0},{...release(),tag:'feature'},
      {...release(),checkedAt:undefined},{...release(),checkedAt:Date.now()+60000},
      {...release(),checkedAt:Date.now()-7*3600000}]) {
      await assert.rejects(installCliUpdate(value,{root,run}),/Check a newer/);
    }
    await assert.rejects(installCliUpdate(release(),{root,run}),/main branch/);
    assert.equal(fetched,false);
    branch='main';origin='https://github.com/third-party/fork.git';
    await assert.rejects(installCliUpdate(release(),{root,run}),/origin/);
    assert.equal(fetched,false);
    origin='git@github.com:jeremykenedy/fire-tv-toolkit.git';
    await assert.rejects(installCliUpdate(release(),{root,run}),/replacement version/);
    assert.equal(fetched,true);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('desktop updater requires one exact published checksum and byte count',async()=>{
  assert.equal(desktopAsset('linux','x64'),'Fire-TV-Toolkit-linux-x86_64.AppImage');
  assert.equal(desktopAsset('win32','arm64'),'Fire-TV-Toolkit-win-arm64.exe');
  const name=desktopAsset(process.platform,process.arch);
  const url=file=>`https://github.com/jeremykenedy/fire-tv-toolkit/releases/download/v4.4.0/${file}`;
  const bytes=Buffer.from('reviewed installer');
  const hash=createHash('sha256').update(bytes).digest('hex');
  const update={...release(),assets:[{name,size:bytes.length,browser_download_url:url(name)},
    {name:'SHA256SUMS',browser_download_url:url('SHA256SUMS')}]};
  const fetchAsset=async()=>({ok:true,text:async()=>`${hash}  ${name}\n`,arrayBuffer:async()=>bytes});
  await assert.rejects(downloadDesktopUpdate({...update,assets:[]},{fetchAsset}),/no installer/);
  await assert.rejects(downloadDesktopUpdate({...update,assets:[{...update.assets[0],size:0},update.assets[1]]},{fetchAsset}),/size/);
  await assert.rejects(downloadDesktopUpdate(update,{fetchAsset:async()=>({ok:false})}),/checksum could/);
  await assert.rejects(downloadDesktopUpdate(update,{fetchAsset:async()=>({ok:true,text:async()=> 'x'.repeat(65537)})}),/too large/);
  for(const text of ['',`${hash}  ${name}\n${hash}  ${name}\n`]) {
    await assert.rejects(downloadDesktopUpdate(update,{fetchAsset:async()=>({ok:true,text:async()=> text})}),/unique/);
  }
  await assert.rejects(downloadDesktopUpdate(update,{fetchAsset:async source=>source.endsWith('SHA256SUMS')
    ? fetchAsset(source) : {ok:false}}),/download failed/);
  await assert.rejects(downloadDesktopUpdate({...update,assets:[{...update.assets[0],size:bytes.length+1},update.assets[1]]},{fetchAsset}),/checksum and size/);
});
