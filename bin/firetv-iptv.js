#!/usr/bin/env node
import { renderBanner } from '../src/banner.js';
import { parseFlags, exitOnFlagError } from '../src/cli-args.js';
import { ensureConnected } from '../src/adb.js';
import { requireInstalled } from '../src/device-config.js';
import { manageIptv, FLAG_SPEC } from '../src/steps/iptv.js';

let flags;
try {
  flags = parseFlags(FLAG_SPEC, process.argv.slice(2));
} catch (err) {
  exitOnFlagError(err, 'firetv-iptv --install');
}

renderBanner();
requireInstalled();

const ip = await ensureConnected();
await manageIptv(ip, flags);
