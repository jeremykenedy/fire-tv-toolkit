import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import * as adb from 'fire-tv-toolkit/src/adb.js';
import * as config from 'fire-tv-toolkit/src/device-config.js';
import * as alexa from 'fire-tv-toolkit/src/apply/alexa-fix.js';
import * as timers from 'fire-tv-toolkit/src/apply/timeouts.js';
import * as timerConfig from 'fire-tv-toolkit/src/timeout-config.js';
import * as dreams from 'fire-tv-toolkit/src/apply/set-screensaver.js';
import * as downloads from 'fire-tv-toolkit/src/apply/screensavers.js';
import * as home from 'fire-tv-toolkit/src/apply/launcher.js';
import * as protection from 'fire-tv-toolkit/src/apply/guard.js';
import * as guardConfig from 'fire-tv-toolkit/src/guard-config.js';
import * as optimizer from 'fire-tv-toolkit/src/apply/optimize.js';
import {
  SCREENSAVERS,
  BUILT_IN_SCREENSAVERS,
  AMAZON_DEFAULT,
  sameComponent,
} from 'fire-tv-toolkit/src/screensaver-registry.js';
import {
  HOME_LAUNCHERS,
  HOME_REDIRECT,
  launcherApps,
} from 'fire-tv-toolkit/src/launcher-registry.js';
import { OWNTV } from 'fire-tv-toolkit/src/iptv-registry.js';
import { ALL_CHANNELS_PLAYLIST } from './iptv.js';

const toolkit = {
  ...adb,
  ...config,
  ...alexa,
  ...timers,
  ...timerConfig,
  ...dreams,
  ...downloads,
  ...home,
  ...protection,
  ...guardConfig,
  ...optimizer,
};
const savers = [
  ...SCREENSAVERS.filter((entry) => !entry.private),
  ...BUILT_IN_SCREENSAVERS,
  AMAZON_DEFAULT,
];

function writeJson(file, value) {
  const temporary = `${file}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(value), { mode: 0o600 });
  fs.renameSync(temporary, file);
}

export function createController({
  dataDir,
  api = toolkit,
  onProgress = () => {},
}) {
  fs.mkdirSync(dataDir, { recursive: true });
  let device = null;
  let busy = false;

  async function exclusive(work) {
    if (busy) throw new Error('Wait for the current task to finish.');
    busy = true;
    try {
      return await work();
    } finally {
      busy = false;
    }
  }

  async function requireConnection() {
    if (!device) throw new Error('Connect to your Fire TV first.');
    if (!(await api.isReachable(device.ip))) {
      device = null;
      throw new Error(
        'The TV disconnected. Check its power and network, then connect again.',
      );
    }
    return device.ip;
  }

  async function readState() {
    const ip = await requireConnection();
    const [installed, active, alexaEnabled, sleepMs, screensaverMs, launcher] =
      await Promise.all([
        api.listPackages(ip),
        api.getActiveScreensaver(ip),
        api.isAlexaFixEnabled(ip),
        ...api.TIMEOUTS.map((definition) => api.getTimeoutMs(ip, definition)),
        api.launcherState(ip),
      ]);
    for (const [id, value] of [
      ['sleep', sleepMs],
      ['screensaver', screensaverMs],
    ]) {
      if (value !== null && !api.hasFactoryBaseline(id))
        api.saveFactoryBaseline(id, value);
    }
    return {
      device: { ...device },
      alexaEnabled,
      sleepMs,
      screensaverMs,
      home: launcher.home,
      guardConfigured: api.guardState().on,
      ownTvInstalled: installed.includes(OWNTV.pkg),
      homeRedirectInstalled: installed.includes(HOME_REDIRECT.pkg),
      screensavers: savers.map((entry) => ({
        id: entry.id,
        name: entry.name,
        description: entry.description || '',
        installed: installed.includes(entry.pkg),
        active: sameComponent(entry.dreamComponent, active),
        downloadable: SCREENSAVERS.includes(entry),
      })),
      launchers: HOME_LAUNCHERS.map((entry) => ({
        id: entry.id,
        name: entry.name,
        installed: installed.includes(entry.pkg),
      })),
      playlist: ALL_CHANNELS_PLAYLIST,
    };
  }

  function validate(request) {
    if (!request || typeof request !== 'object' || Array.isArray(request))
      throw new Error('Choose a supported task.');
    const { type, id, value } = request;
    switch (type) {
      case 'alexa':
      case 'guard':
        if (typeof value !== 'boolean') throw new Error('Choose on or off.');
        return { type, value };
      case 'install-screensaver':
      case 'activate-screensaver':
      case 'remove-screensaver': {
        const entry = savers.find((candidate) => candidate.id === id);
        if (
          !entry ||
          (type !== 'activate-screensaver' && !SCREENSAVERS.includes(entry))
        )
          throw new Error('Choose a supported screensaver.');
        return { type, entry };
      }
      case 'home':
      case 'install-launcher':
        if (
          !HOME_LAUNCHERS.some((entry) => entry.id === id) &&
          !(id === 'amazon' && type === 'home')
        )
          throw new Error('Choose a supported home screen.');
        return { type, id };
      case 'timeout': {
        const definition = api.findTimeoutById(id);
        if (
          !definition ||
          !Number.isInteger(value) ||
          value < (id === 'sleep' ? 0 : 1) ||
          value > 2147460000
        )
          throw new Error('Enter a valid timeout in minutes.');
        return { type, id, value, definition };
      }
      case 'reset-timeouts':
      case 'optimize':
      case 'undo-optimize':
      case 'check-guard':
      case 'install-owntv':
      case 'open-owntv':
        return { type };
      default:
        throw new Error('Choose a supported task.');
    }
  }

  async function plan(action, ip) {
    switch (action.type) {
      case 'alexa':
        return {
          title: `${action.value ? 'Enable' : 'Disable'} Alexa wake`,
          detail:
            'Change the setting that lets Alexa reach your TV during deep sleep.',
        };
      case 'guard':
        return {
          title: `Turn protection ${action.value ? 'on' : 'off'}`,
          detail: action.value
            ? 'Install Home Redirect if needed, protect your current settings, and limit Amazon updaters where Fire OS allows it.'
            : 'Stop protecting settings and restore updater permissions recorded by this desktop app.',
        };
      case 'install-screensaver':
        return {
          title: `Install ${action.entry.name}`,
          detail:
            'Download its GitHub release, verify its SHA-256, and install it on this TV. It becomes active only when you choose Use.',
        };
      case 'remove-screensaver':
        return {
          title: `Remove ${action.entry.name}`,
          detail:
            'Uninstall this app and its saved app data from the TV. Switch to another screensaver first if it is active.',
        };
      case 'activate-screensaver':
        return {
          title: `Use ${action.entry.name}`,
          detail: 'Set this installed screensaver as the active screensaver.',
        };
      case 'install-launcher':
        return {
          title: `Install ${HOME_LAUNCHERS.find((entry) => entry.id === action.id).name}`,
          detail:
            'Download and verify the launcher and Home Redirect, then grant their required permissions. Your Home button changes only when you choose Use.',
        };
      case 'home':
        return {
          title: `Use ${action.id === 'amazon' ? 'Amazon Home' : HOME_LAUNCHERS.find((entry) => entry.id === action.id).name}`,
          detail:
            'Change the Home button destination and press Home on the TV to show it.',
        };
      case 'timeout':
        return {
          title: `Change ${action.id === 'sleep' ? 'sleep' : 'screensaver'} timer`,
          detail:
            action.value === 0
              ? 'Set sleep to never. The TV will remain awake.'
              : `Set the timer to ${Number((action.value / 60000).toFixed(2))} minutes.`,
        };
      case 'reset-timeouts':
        return {
          title: 'Restore captured timers',
          detail:
            'Restore the sleep and screensaver values first read from this TV by this desktop app.',
        };
      case 'optimize': {
        action.changes = api.planOptimizations(await api.readOptimizeState(ip));
        return {
          title: 'Optimize for screensavers',
          detail: action.changes.length
            ? action.changes.map((change) => change.label).join('\n')
            : 'This TV already has the recommended settings.',
        };
      }
      case 'undo-optimize':
        return {
          title: 'Undo screensaver optimizations',
          detail:
            'Restore the original values saved before this desktop app optimized the TV.',
        };
      case 'check-guard':
        return {
          title: 'Check and repair protection',
          detail:
            'Restore guarded settings and apply the updater restrictions recorded by this desktop app.',
        };
      case 'install-owntv':
        return {
          title: 'Install OwnTV',
          detail:
            'Download, verify and install OwnTV. Add the playlist using OwnTV setup on your TV or phone.',
        };
      case 'open-owntv':
        return {
          title: 'Open OwnTV',
          detail: 'Open the live TV app on your television.',
        };
    }
  }

  function requireVerified(result, message) {
    if (!result) throw new Error(message);
  }

  function requireResults(results) {
    for (const result of results)
      onProgress(
        `${result.label || result.change?.label}: ${result.ok ? 'saved' : 'failed'}`,
      );
    const failed = results.filter((result) => !result.ok);
    if (failed.length)
      throw new Error(
        failed
          .map(
            (result) =>
              `${result.label || result.change?.label}${result.detail ? `: ${result.detail}` : ''}`,
          )
          .join('\n'),
      );
  }

  async function install(ip, entry) {
    onProgress(`Downloading and verifying ${entry.name}...`);
    const file = await api.downloadApk(entry);
    try {
      await api.installApk(ip, file);
    } finally {
      api.removeDownload(file);
    }
    requireVerified(
      (await api.listPackages(ip)).includes(entry.pkg),
      `${entry.name} was not found on the TV after installation.`,
    );
  }

  async function apply(action, ip) {
    switch (action.type) {
      case 'alexa':
        requireVerified(
          (await api.setAlexaFix(ip, action.value)) === action.value,
          'The TV did not save the Alexa setting.',
        );
        break;
      case 'timeout':
        requireVerified(
          (await api.setTimeoutMs(ip, action.definition, action.value)).applied,
          'The TV did not accept that timer. Choose another value.',
        );
        break;
      case 'reset-timeouts':
        for (const definition of api.TIMEOUTS) {
          const baseline = api.getFactoryBaseline(definition.id);
          if (baseline !== null)
            requireVerified(
              (await api.setTimeoutMs(ip, definition, baseline)).applied,
              `The TV did not restore the ${definition.id} timer.`,
            );
        }
        break;
      case 'install-screensaver':
        await install(ip, action.entry);
        break;
      case 'activate-screensaver':
        requireVerified(
          (await api.listPackages(ip)).includes(action.entry.pkg),
          'Install this screensaver first.',
        );
        await api.setActiveScreensaver(ip, action.entry.dreamComponent);
        requireVerified(
          sameComponent(
            await api.getActiveScreensaver(ip),
            action.entry.dreamComponent,
          ),
          'The TV did not save the screensaver selection.',
        );
        break;
      case 'remove-screensaver':
        if (
          sameComponent(
            await api.getActiveScreensaver(ip),
            action.entry.dreamComponent,
          )
        )
          throw new Error(
            'Choose another screensaver before removing the active one.',
          );
        requireVerified(
          await api.uninstallPackage(ip, action.entry.pkg),
          'The TV did not remove the screensaver.',
        );
        break;
      case 'install-launcher':
        for (const entry of launcherApps(action.id)) {
          onProgress(`Installing ${entry.name}...`);
          const result = await api.installLauncherApp(ip, entry);
          requireVerified(
            result.ok,
            result.error || `Could not install ${entry.name}.`,
          );
          requireVerified(
            (await api.listPackages(ip)).includes(entry.pkg),
            `${entry.name} was not found on the TV after installation.`,
          );
        }
        break;
      case 'home':
        if (action.id !== 'amazon') {
          const installed = await api.listPackages(ip);
          requireVerified(
            launcherApps(action.id).every((entry) =>
              installed.includes(entry.pkg),
            ),
            'Install this launcher and Home Redirect first.',
          );
        }
        requireVerified(
          await api.useHome(ip, action.id),
          'The TV did not save the Home button destination.',
        );
        break;
      case 'guard':
        requireResults(
          await (action.value ? api.turnGuardOn(ip) : api.turnGuardOff(ip)),
        );
        break;
      case 'check-guard': {
        const result = await api.checkGuard(ip);
        requireResults(result.results);
        requireVerified(
          result.restored !== null,
          'Protection did not answer. Turn it on from this app first.',
        );
        break;
      }
      case 'optimize':
        requireResults(await api.applyOptimizations(ip, action.changes));
        break;
      case 'undo-optimize':
        requireResults(await api.revertOptimizations(ip));
        break;
      case 'install-owntv':
        await install(ip, OWNTV);
        break;
      case 'open-owntv':
        requireVerified(
          await api.openApp(ip, OWNTV.pkg),
          'OwnTV did not open. Install it first.',
        );
        break;
    }
  }

  return {
    initial() {
      let savedIp = '';
      try {
        savedIp = JSON.parse(
          fs.readFileSync(path.join(dataDir, 'last-device.json'), 'utf8'),
        ).ip;
      } catch {
        /* First launch has no saved device. */
      }
      return {
        savedIp:
          typeof savedIp === 'string' && api.isValidIp(savedIp) ? savedIp : '',
      };
    },
    connect(value) {
      return exclusive(async () => {
        if (typeof value !== 'string' || !api.isValidIp(value))
          throw new Error('Enter a valid IPv4 address, such as 192.168.1.50.');
        device = null;
        const ip = value.trim();
        if (!(await api.isAdbInstalled()))
          throw new Error(
            'ADB is missing. Run the desktop ADB setup command or reinstall the desktop app.',
          );
        onProgress(`Connecting to ${ip}:5555...`);
        await api.connect(ip);
        if (!(await api.isReachable(ip)))
          throw new Error(
            'Could not reach this TV. Enable ADB debugging, accept the prompt on the TV, then connect again.',
          );
        const info = await api.deviceInfo(ip);
        const identity = createHash('sha256')
          .update(info.serial || `${info.model}:${ip}`)
          .digest('hex');
        const directory = path.join(dataDir, 'devices', identity);
        fs.mkdirSync(directory, { recursive: true });
        api.setConfigDirectory(directory);
        api.saveIp(ip);
        device = { ip, model: info.model, android: info.android };
        let state;
        try {
          state = await readState();
        } catch (error) {
          device = null;
          throw error;
        }
        writeJson(path.join(dataDir, 'last-device.json'), { ip });
        return state;
      });
    },
    refresh() {
      return exclusive(readState);
    },
    action(request, confirm) {
      return exclusive(async () => {
        const action = validate(request);
        const ip = await requireConnection();
        const proposal = await plan(action, ip);
        if (!(await confirm({ ...proposal, ip }))) return { cancelled: true };
        await requireConnection();
        onProgress(`${proposal.title}...`);
        await apply(action, ip);
        const state = await readState();
        onProgress(`${proposal.title}: complete.`);
        return { message: `${proposal.title}: complete.`, state };
      });
    },
    isBusy() {
      return busy;
    },
    isConnected() {
      return device !== null;
    },
  };
}
