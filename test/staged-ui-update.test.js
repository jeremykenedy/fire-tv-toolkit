import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {stageUiUpdate,setAdbExecutable,packageDetails} from '../src/adb.js';

test('private UI handoff uses fixed TV paths, safe metadata and explicit native acknowledgement',async()=>{
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'ui-staging-'));
 const binary=path.join(folder,'adb');
 const stateFile=binary+'.json';
 fs.writeFileSync(binary,`#!/usr/bin/env node
const fs=require('node:fs');
const file=__filename+'.json';const state=JSON.parse(fs.readFileSync(file));
const args=process.argv.slice(2);state.calls.push(args);
let reply='';
if(args.includes('push')&&args.at(-1).endsWith('.json'))state.metadata=JSON.parse(fs.readFileSync(args[3]));
if(args.includes('broadcast'))reply=state.rejected?'Broadcast completed: result=0':'Broadcast completed: result=0, data="ok"';
if(args.includes('package'))reply='versionCode=38 minSdk=27\\nversionName=1.4.0';
fs.writeFileSync(file,JSON.stringify(state));console.log(reply);
`,{mode:0o755});
 const metadata={name:'Fire TV UI',package:'com.jeremykenedy.firetv.ui',repo:'jeremykenedy/fire-tv-ui',dream:'',preview:'',tag:'v1.4.0',sha256:'a'.repeat(64),bytes:123,url:'https://github.com/jeremykenedy/fire-tv-ui/releases/download/v1.4.0/fire-tv-ui.apk',checked_at:Date.now(),unreviewed:'must-not-be-copied'};
 const reset=rejected=>fs.writeFileSync(stateFile,JSON.stringify({calls:[],rejected}));
 try {
  setAdbExecutable(binary);reset(false);
  await stageUiUpdate('192.0.2.7','/controlled/test.apk',metadata);
  const state=JSON.parse(fs.readFileSync(stateFile));
  assert.equal(state.metadata.unreviewed,undefined);
  assert.equal(state.metadata.package,metadata.package);
  assert.ok(state.calls.every(call=>call[1]==='192.0.2.7:5555'));
  assert.deepEqual(state.calls.filter(call=>call.includes('push')).map(call=>call.at(-1)),
    ['/sdcard/Download/fire-tv-ui-update.apk','/sdcard/Download/fire-tv-ui-update.json']);
  assert.equal(fs.existsSync(state.calls.find(call=>call.at(-1).endsWith('.json'))[3]),false);
  assert.deepEqual(await packageDetails('192.0.2.7',metadata.package),{versionName:'1.4.0',versionCode:38n});
  reset(true);await assert.rejects(stageUiUpdate('192.0.2.7','/controlled/test.apk',metadata),/did not verify/);
 } finally {setAdbExecutable(null);fs.rmSync(folder,{recursive:true,force:true});}
});
