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
  const broken=Buffer.from(valid);broken.writeUInt32LE(2 ** 32 - 1,12);
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


test('reads a literal Android app version separately from its repository release tag', () => {
  for (const utf8 of [true, false]) {
    const app = parseBinaryManifest(manifest({utf8, pkg: 'com.jeremykenedy.firetv.homeredirect', version: 125, versionName: '1.2.5'}));
    assert.equal(app.versionName, '1.2.5');
    assert.equal(app.versionCode, 125n);
  }
  assert.throws(() => parseBinaryManifest(manifest({versionName: '1.2\u001b[31m'})), /version name/);
});

test('optional SDK inspection reads compiled requirements without changing the existing manifest result', () => {
  for (const utf8 of [true, false]) {
    const bytes = manifest({ utf8, minSdk: 27, targetSdk: 36 });
    assert.deepEqual(parseBinaryManifest(bytes), { package: 'example.app', versionCode: 42n });
    assert.deepEqual(parseBinaryManifest(bytes, { includeSdk: true }),
      { package: 'example.app', versionCode: 42n, minSdk: 27, targetSdk: 36 });
  }
  for (const [input, minSdk, targetSdk] of [[{}, 1, 1], [{ minSdk: 27 }, 27, 27], [{ targetSdk: 36 }, 1, 36]]) {
    const actual = parseBinaryManifest(manifest(input), { includeSdk: true });
    assert.equal(actual.minSdk, minSdk);
    assert.equal(actual.targetSdk, targetSdk);
  }
});

test('SDK inspection rejects unsupported levels and duplicate declarations and ignores foreign namespaces', () => {
  for (const input of [{ minSdk: 0 }, { minSdk: 0xffffffff }, { minSdk: 'Preview' }, { minSdk: 27, targetSdk: 'Preview' }])
    assert.throws(() => parseBinaryManifest(manifest(input), { includeSdk: true }), /numeric API levels/);
  const foreign = parseBinaryManifest(manifest({ minSdk: 27, targetSdk: 36, sdkNamespace: 'urn:other' }), { includeSdk: true });
  assert.equal(foreign.minSdk, 1);
  assert.equal(foreign.targetSdk, 1);
  const valid = manifest({ minSdk: 27 });
  const poolEnd = 8 + valid.readUInt32LE(12);
  const sdkStart = poolEnd + valid.readUInt32LE(poolEnd + 4);
  const duplicate = Buffer.concat([valid, valid.subarray(sdkStart)]);
  duplicate.writeUInt32LE(duplicate.length, 4);
  assert.throws(() => parseBinaryManifest(duplicate, { includeSdk: true }), /Duplicate APK uses-sdk/);
  const truncated = Buffer.from(valid);
  truncated.writeUInt32LE(35, sdkStart + 4);
  assert.throws(() => parseBinaryManifest(truncated, { includeSdk: true }), /Truncated Android manifest element/);
});
