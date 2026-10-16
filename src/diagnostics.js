import { readDiagnostic } from './adb.js';
import { SCREENSAVERS } from './screensaver-registry.js';

const UNAVAILABLE = 'Unavailable on this device';

function matching(text, pattern, limit = 24) {
  return text.split('\n').map((line) => line.trim()).filter((line) => pattern.test(line)).slice(0, limit).join('\n') || UNAVAILABLE;
}

function surfaces(text) {
  const found = [];
  for (const block of text.split(/(?=^(?:\* Layer |\+ (?:BufferQueueLayer|BufferStateLayer) ))/m)) {
    const heading = block.split('\n')[0];
    if (!/^(?:\* Layer |\+ (?:BufferQueueLayer|BufferStateLayer) )/.test(heading)) continue;
    if (!SCREENSAVERS.some(({ pkg }) => heading.includes(`${pkg}/`))) continue;
    const buffer = /activeBuffer=\[\s*([1-9]\d*)x\s*([1-9]\d*)/.exec(block);
    const geometry = /geomBufferSize=\[\s*0\s+0\s+([1-9]\d*)\s+([1-9]\d*)\]/.exec(block);
    const size = buffer || geometry;
    if (size) found.push(`${heading.trim()}\nReported buffer: ${size[1]} x ${size[2]}`);
  }
  return found.slice(0, 16).join('\n\n') || 'No catalog screensaver buffer reported in this snapshot';
}

/** Collects a snapshot without launching, stopping, resetting or changing apps. */
export async function collectDiagnostics(ip, read = readDiagnostic) {
  const sections = [];
  const query = async (args, summarize = (text) => text.trim() || UNAVAILABLE) => {
    try {
      const output = await read(ip, args);
      if (/permission denial|permission denied|can't find service|unknown command|not found/i.test(output)) return UNAVAILABLE;
      return summarize(output);
    } catch {
      return UNAVAILABLE;
    }
  };
  const add = async (title, args, summarize) => sections.push({ title, text: await query(args, summarize) });

  await add('Device model', ['getprop', 'ro.product.model']);
  await add('Android API', ['getprop', 'ro.build.version.sdk']);
  const selected = await query(['settings', 'get', 'secure', 'screensaver_components']);
  sections.push({ title: 'Selected screensaver', text: selected });
  await add('Screensaver enabled', ['settings', 'get', 'secure', 'screensaver_enabled']);
  await add('Running dream', ['dumpsys', 'dreams'], (out) => matching(out, /mCurrentDream|mDreamComponent|isDreaming|mIsDreaming|mDreaming|mService|mName=/));
  await add('Display modes reported by Android', ['dumpsys', 'display'], (out) => matching(out, /DisplayDeviceInfo|mActiveModeId|mDefaultModeId|mUserPreferredMode|mSystemPreferredMode/));
  await add('Window layout sizes', ['dumpsys', 'window', 'windows'], (out) => matching(out, /^mFrame=|^Requested w=/));
  await add('Screensaver surface buffers', ['dumpsys', 'SurfaceFlinger'], surfaces);
  await add('System memory', ['cat', '/proc/meminfo'], (out) => matching(out, /^(MemTotal|MemFree|MemAvailable|SwapTotal|SwapFree):/));
  await add('App storage', ['df', '-h', '/data'], (out) => out.trim());

  const installed = await query(['pm', 'list', 'packages']);
  const packages = new Set(installed.split('\n').map((line) => line.replace(/^package:/, '').trim()));
  const versions = [];
  for (const saver of SCREENSAVERS.filter((item) => packages.has(item.pkg))) {
    const version = await query(['dumpsys', 'package', saver.pkg], (out) => matching(out, /^version(Name|Code)=/, 2));
    versions.push(`${saver.name} (${saver.pkg})\n${version}`);
  }
  sections.push({ title: 'Installed screensaver versions', text: versions.join('\n\n') || (installed === UNAVAILABLE ? UNAVAILABLE : 'No catalog screensavers installed') });

  // Only inspect known selected apps. Exit summaries exclude stack traces and app data.
  const active = SCREENSAVERS.find((item) => selected.split(',').some((component) => component.startsWith(`${item.pkg}/`)));
  if (active && packages.has(active.pkg)) {
    await add(`Selected app memory: ${active.name}`, ['dumpsys', 'meminfo', active.pkg], (out) => matching(out, /TOTAL\s|TOTAL PSS:|TOTAL RSS:|No process found/));
    await add(`Recent exits: ${active.name}`, ['dumpsys', 'activity', 'exit-info', active.pkg], (out) => matching(out, /timestamp=|reason=|subreason=|No exit info|No historical process exit/));
    await add(`UI frame counters: ${active.name}`, ['dumpsys', 'gfxinfo', active.pkg], (out) => matching(out, /Total frames rendered:|Janky frames:|percentile:|Number .*deadline|No process found/));
  }
  return { capturedAt: new Date().toISOString(), sections };
}

export function formatDiagnostics(report) {
  return [
    `Fire TV diagnostics: ${report.capturedAt}`,
    'Read-only snapshot. No TV settings or apps were changed.',
    'Display modes do not prove an app renders at that resolution. Window sizes are reported separately.',
    'Surface buffers are a snapshot of reported layers, including retained layers; they do not prove live rendering or frame rate.',
    'UI frame counters cover Android views; they do not measure OpenGL, Filament or video playback FPS.',
    ...report.sections.map(({ title, text }) => `\n${title}\n${text}`),
  ].join('\n');
}
