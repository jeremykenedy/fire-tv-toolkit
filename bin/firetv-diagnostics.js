#!/usr/bin/env node
import { renderBanner } from '../src/banner.js';
import { parseFlags, exitOnFlagError } from '../src/cli-args.js';
import { ensureConnected } from '../src/adb.js';
import { requireInstalled } from '../src/device-config.js';
import { diagnosticsReport } from '../src/steps/diagnostics.js';

try {
  parseFlags({}, process.argv.slice(2));
} catch (err) {
  exitOnFlagError(err, 'firetv-diagnostics');
}

renderBanner();
requireInstalled();
await diagnosticsReport(await ensureConnected());
