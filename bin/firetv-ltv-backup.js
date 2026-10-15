#!/usr/bin/env node
import { renderBanner } from '../src/banner.js';
import { parseFlags, exitOnFlagError } from '../src/cli-args.js';
import { ensureConnected } from '../src/adb.js';
import { requireInstalled } from '../src/device-config.js';
import { manageLtvBackup, FLAG_SPEC } from '../src/steps/ltv-backup.js';

let flags;
try {
  flags = parseFlags(FLAG_SPEC, process.argv.slice(2));
} catch (err) {
  exitOnFlagError(err, 'firetv-ltv-backup --pull=ltv-backup.json');
}

renderBanner();
requireInstalled();

const ip = await ensureConnected();
await manageLtvBackup(ip, flags);
