import test from 'node:test';
import assert from 'node:assert/strict';
import {manageUpdates,updateLabel} from '../src/steps/updates.js';
import {BACK,EXIT} from '../src/ui.js';

const row=(comparison,status='checked')=>({id:'pipe',name:'Pipe',installed:'1.0.0',comparison,status,
  error:'Network unavailable',published:{tag:'v1.1.0'}});

test('update menu preserves cancellation and confirms the explicit target before replacement',async()=>{
  const ip='192.0.2.74', output=[];
  let writes=0, checks=0;
  const api={write:value=>output.push(value),checkApps:async target=>{assert.equal(target,ip);checks++;return [row(1)];},
    installApp:async(target,item)=>{assert.equal(target,ip);assert.equal(item.id,'pipe');writes++;return {message:'Replacement verified'};}};
  for(const cancel of [BACK,EXIT]) await manageUpdates(ip,{...api,choose:async()=>cancel});
  assert.equal(checks,0);
  for(const confirmed of [false,true]){
    const choices=['apps','pipe'];
    await manageUpdates(ip,{...api,choose:async()=>choices.shift(),confirm:async prompt=>{
      assert.match(prompt,/Pipe on 192\.0\.2\.74/);return confirmed;
    }});
  }
  assert.equal(writes,1);
  assert.ok(output.includes('Replacement verified'));
  const choices=['apps',BACK];
  await manageUpdates(ip,{...api,choose:async()=>choices.shift(),confirm:()=>{throw new Error('Cancellation confirmed an install');}});
  assert.equal(writes,1);
});

test('no available update does not install or call a failed check current',async()=>{
  const output=[];
  await manageUpdates('192.0.2.74',{choose:async()=> 'apps',write:value=>output.push(value),
    checkApps:async()=>[row(0),row(-1),row(null,'unavailable')],
    confirm:()=>{throw new Error('No update should request confirmation');}});
  assert.ok(output.some(value=>value.includes('check unavailable')));
  assert.ok(output.some(value=>value.includes('matches checked release')));
  assert.ok(output.some(value=>value.includes('installed version is newer')));
  assert.ok(output.at(-1).includes('Unavailable checks are not up-to-date claims'));
  assert.match(updateLabel(row(null)),/cannot be ordered/);
});

test('Toolkit self-update needs both a newer checked release and confirmation',async()=>{
  let installed=0;
  for(const comparison of [0,-1,1]) for(const confirmed of [false,true]){
    await manageUpdates('192.0.2.74',{choose:async()=> 'self',write:()=>{},
      checkSelf:async()=>({installed:'4.3.2',tag:'v4.4.0',comparison}),confirm:async()=>confirmed,
      installSelf:async release=>{assert.equal(release.tag,'v4.4.0');installed++;return {message:'Updated'};}});
  }
  assert.equal(installed,1);
  await assert.rejects(manageUpdates('192.0.2.74',{choose:async()=> 'self',checkSelf:async()=>{
    throw new Error('Network unavailable');}}),/Network unavailable/);
});
