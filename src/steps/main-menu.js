import chalk from 'chalk';
import { renderBanner } from '../banner.js';
import { menu, EXIT } from '../ui.js';
import { isInstalled, setInstalled } from '../device-config.js';
import { ensureDeviceReady } from './device-setup.js';
import { installAdbStep } from './install-adb.js';
import { alexaFixMenu } from './alexa-fix.js';
import { manageScreensavers } from './screensavers.js';
import { setScreensaver } from './set-screensaver.js';
import { reviewTimeoutsIfWanted, manageAllTimeoutsStep } from './timeout-manage.js';
import { manageLauncher } from './launcher.js';
import { manageIptv } from './iptv.js';
import { manageLtvNotifications } from './ltv-notifications.js';
import { manageLtvBackup } from './ltv-backup.js';
import { optimizeIfWanted, optimizeForScreensavers } from './optimize.js';
import { guardIfWanted, manageGuard } from './guard.js';
import { uninstallEverything } from './uninstall.js';
import { printCommandList } from '../command-list.js';
import { print } from '../output.js';
import { manageUpdates } from './updates.js';
import { diagnosticsReport } from './diagnostics.js';

const MENU_CHOICES = [
  { name: 'Install Android SDK Platform Tools (adb)', value: 'adb' },
  { name: 'Toggle Amazon deep-sleep fix', value: 'alexa' },
  { name: 'Install or uninstall screensavers', value: 'screensavers' },
  { name: 'Choose the active screensaver', value: 'set-screensaver' },
  { name: 'Review or adjust TV timeouts', value: 'timeouts' },
  { name: 'Choose the home screen (Fire TV UI recommended)', value: 'launcher' },
  { name: 'Install or remove fire-iptv or OwnTV', value: 'iptv' },
  { name: 'Allow or remove LTvLauncher notification access', value: 'ltv-notifications' },
  { name: 'Copy an LTvLauncher backup to this computer', value: 'ltv-backup' },
  { name: 'Optimize the TV for screensavers', value: 'optimize' },
  { name: 'Guard your setup so Amazon cannot undo it', value: 'guard' },
  { name: 'Revert the TV, item by item', value: 'revert' },
  { name: 'List all commands', value: 'commands' },
  { name: 'Advanced: read device and screensaver diagnostics', value: 'diagnostics' },
  { name: 'Check for updates: Toolkit, Fire TV UI and installed screensavers', value: 'updates' },
];

const MENU_ACTIONS = {
  updates: (ip) => manageUpdates(ip),
  adb: () => installAdbStep(),
  alexa: (ip) => alexaFixMenu(ip),
  screensavers: (ip) => manageScreensavers(ip),
  'set-screensaver': (ip) => setScreensaver(ip),
  timeouts: (ip) => manageAllTimeoutsStep(ip),
  launcher: (ip) => manageLauncher(ip),
  iptv: (ip) => manageIptv(ip),
  'ltv-notifications': (ip) => manageLtvNotifications(ip),
  'ltv-backup': (ip) => manageLtvBackup(ip),
  optimize: (ip) => optimizeForScreensavers(ip),
  guard: (ip) => manageGuard(ip),
  diagnostics: (ip) => diagnosticsReport(ip),
  revert: (ip) => uninstallEverything(ip),
  commands: () => printCommandList(),
};

function printIntro() {
  print('What this does, one line per step:');
  print(chalk.gray('  1. Install Android SDK Platform Tools (adb) if you do not have it.'));
  print(chalk.gray('  2. Turn the Alexa deep-sleep fix on or off.'));
  print(chalk.gray('  3. Install or remove ad-free screensavers.'));
  print(chalk.gray('  4. Choose which installed screensaver is active.'));
  print(chalk.gray('  5. Review or change the TV sleep and screensaver timeouts, optimize the TV for screensavers, and guard it all (optional).'));
  print(chalk.gray('  6. Choose Fire TV UI (recommended), AT4K, LTvLauncher or the Amazon home screen (optional).'));
  print(chalk.gray('  7. Install fire-iptv for automatic live TV setup, or choose OwnTV (optional).'));
  print(chalk.gray('  8. Let LTvLauncher read notifications, or copy its backups to this computer (optional).'));
  print(chalk.gray('  9. Optimize, guard or revert the TV, or list every command, any time from the menu.'));
  print(chalk.gray('\nEach standalone command is named after its step in the README.\n'));
}

async function runMenuLoop(ip) {
  let choice;
  do {
    choice = await menu({ top: true, message: 'What would you like to do?', choices: MENU_CHOICES });
    await MENU_ACTIONS[choice]?.(ip);
  } while (choice !== EXIT);
}

/**
 * The full guided flow: banner, adb check, device setup, optional timeout
 * review, optional screensaver optimizing and guard, then the interactive "What would you like to do?" menu loop.
 * Shared by every entry point that launches the guided experience
 * (`fire-tv-toolkit`, `start`, `update`), so they can never drift
 * apart. Marks INSTALLED=true in .env the moment device setup succeeds with
 * a saved IP.
 * @returns {Promise<void>}
 */
export async function runMainMenu({ showBanner = true } = {}) {
  if (showBanner) {
    renderBanner();
  }
  printIntro();

  await installAdbStep();
  const ip = await ensureDeviceReady();
  if (!ip) {
    return;
  }
  setInstalled(true);
  await reviewTimeoutsIfWanted(ip);
  await optimizeIfWanted(ip);
  await guardIfWanted(ip);
  await runMenuLoop(ip);
}

/**
 * Entry point for `start`. If a previous run already completed
 * device setup (INSTALLED=true in .env), this is really an update, so it
 * says so and defers to the exact same behavior runUpdateCommand gives.
 * Otherwise it just runs the normal guided flow.
 * @returns {Promise<void>}
 */
export async function runStartCommand() {
  if (isInstalled()) {
    renderBanner();
    print(chalk.yellow('Fire TV Toolkit is already installed. Running update...\n'));
    await runUpdateCommand({ showBanner: false });
    return;
  }
  await runMainMenu();
}

/**
 * Entry point for `update`. If nothing is installed yet, there is nothing
 * to override, so it says so and runs the normal guided flow instead.
 * Otherwise it warns that continuing will override the values already
 * installed (saved IP, etc), then runs the same guided flow.
 * @param {{showBanner?: boolean}} [options]
 * @returns {Promise<void>}
 */
export async function runUpdateCommand({ showBanner = true } = {}) {
  if (showBanner) {
    renderBanner();
  }
  if (!isInstalled()) {
    print(chalk.yellow('Fire TV Toolkit is not installed yet. Running setup...\n'));
    await runMainMenu({ showBanner: false });
    return;
  }
  print(chalk.yellow('This will override the values already installed (your saved Fire TV IP, etc). Press q at the first prompt to cancel.\n'));
  await runMainMenu({ showBanner: false });
}
