import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { deflateRawSync } from 'node:zlib';
import { inspectApk, parseBinaryManifest } from '../src/apk-manifest.js';

import { manifest } from './helpers/apk-fixture.js';
test('reads actual binary manifest package and long version code in both string formats',()=>{
  for(const utf8 of [true,false])assert.deepEqual(parseBinaryManifest(manifest({utf8,major:1})),
    {package:'example.app',versionCode:(1n<<32n)+42n});
});

test('rejects malformed, truncated, missing or invalid package manifests',()=>{
  const valid=manifest();
  for(const data of [Buffer.alloc(0),valid.subarray(0,valid.length-1),manifest({pkg:'invalid'}),Buffer.alloc(80)])
    assert.throws(()=>parseBinaryManifest(data));
  const broken=Buffer.from(valid);broken.writeUInt32LE(4294967295,12);
  assert.throws(()=>parseBinaryManifest(broken));
});


function apkZip(bytes, method = 8, name = 'AndroidManifest.xml') {
  const filename=Buffer.from(name);
  const body=method===8?deflateRawSync(bytes):bytes;
  const local=Buffer.alloc(30+filename.length);
  local.writeUInt32LE(67324752);local.writeUInt16LE(method,8);
  local.writeUInt32LE(body.length,18);local.writeUInt32LE(bytes.length,22);local.writeUInt16LE(filename.length,26);filename.copy(local,30);
  const central=Buffer.alloc(46+filename.length);
  central.writeUInt32LE(33639248);central.writeUInt16LE(method,10);
  central.writeUInt32LE(body.length,20);central.writeUInt32LE(bytes.length,24);central.writeUInt16LE(filename.length,28);filename.copy(central,46);
  const end=Buffer.alloc(22);end.writeUInt32LE(101010256);end.writeUInt16LE(1,8);end.writeUInt16LE(1,10);
  end.writeUInt32LE(central.length,12);end.writeUInt32LE(local.length+body.length,16);
  return Buffer.concat([local,body,central,end]);
}

test('inspects stored and compressed APK ZIP manifests and rejects malformed archives',()=>{
  const folder=fs.mkdtempSync(path.join(os.tmpdir(),'apk-inspection-'));
  const file=path.join(folder,'update.apk');
  try {
    for(const method of [0,8]) {
      fs.writeFileSync(file,apkZip(manifest(),method));
      assert.deepEqual(inspectApk(file),{package:'example.app',versionCode:42n});
    }
    for(const bytes of [Buffer.alloc(22),apkZip(manifest(),4),apkZip(manifest(),8,'other.file'),apkZip(Buffer.alloc(12))]) {
      fs.writeFileSync(file,bytes);assert.throws(()=>inspectApk(file));
    }
    const invalid=apkZip(manifest());invalid.writeUInt16LE(1,invalid.length-18);
    fs.writeFileSync(file,invalid);assert.throws(()=>inspectApk(file));
    fs.writeFileSync(file,Buffer.alloc(0));assert.throws(()=>inspectApk(file));
  } finally {fs.rmSync(folder,{recursive:true,force:true});}
});
