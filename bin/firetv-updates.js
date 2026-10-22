#!/usr/bin/env node
import { parseFlags, exitOnFlagError } from '../src/cli-args.js';
import { connectAndCheck, ensureConnected } from '../src/adb.js';
import { isValidIp } from '../src/device-config.js';
import { checkAppUpdates, installAppUpdate } from '../src/update-releases.js';
import { checkToolkitUpdate, installCliUpdate } from '../src/self-update.js';
import { manageUpdates, updateLabel } from '../src/steps/updates.js';
import { print, printError } from '../src/output.js';

let flags;
try {
  flags=parseFlags({ip:{type:'string',desc:'Explicit target TV IPv4 address.',validate:value=>isValidIp(value)?null:'Enter an IPv4 address.'},
    check:{type:'boolean',desc:'Read published versions without installing.'},
    install:{type:'string',desc:'Install a checked screensaver id, or stage fire-tv-ui for confirmation on the TV.'},
    self:{type:'boolean',desc:'Check Toolkit itself instead of the TV.'},
    yes:{type:'boolean',desc:'Confirm the requested replacement install.'}},process.argv.slice(2));
} catch(error){exitOnFlagError(error,'firetv-updates --ip 192.168.1.74 --check');}
try {
  if(flags.self){
    const release=await checkToolkitUpdate();
    print(`Toolkit installed ${release.installed}; published ${release.tag}.`);
    if(flags.install){
      if(flags.install!=='toolkit'||!flags.yes)throw new Error('Use --self --install toolkit --yes to confirm the CLI update.');
      print((await installCliUpdate(release)).message);
    }
  } else {
    const ip=flags.ip??await ensureConnected();
    if(flags.ip&&!await connectAndCheck(ip))throw new Error(`Could not connect to ${ip}.`);
    if(!flags.check&&!flags.install)await manageUpdates(ip);
    else {
      const rows=await checkAppUpdates(ip);
      for(const row of rows)print(updateLabel(row));
      if(flags.install){
        if(!flags.yes)throw new Error('Use --yes to confirm this replacement install.');
        const row=rows.find(item=>item.id===flags.install);
        if(!row)throw new Error('Choose an installed app id shown by --check.');
        print((await installAppUpdate(ip,row)).message);
      }
    }
  }
} catch(error){printError(error.message);process.exitCode=1;}
