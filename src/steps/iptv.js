import chalk from 'chalk';
import { select } from '../prompts.js';
import { explainStep } from '../ui.js';
import { runWizard } from '../wizard.js';
import { startSpinner } from '../spinner.js';
import { listPackages, uninstallPackage, openApp } from '../adb.js';
import { installLauncherApp } from '../apply/launcher.js';
import { OWNTV, FIRE_IPTV, IPTV_APPS, IPTV_PLAYLIST, IPTV_GUIDES } from '../iptv-registry.js';
import { markFailed } from '../exit-status.js';
import { print } from '../output.js';

export const FLAG_SPEC = {
  app: { type: 'string', choices: ['fire-iptv', 'owntv'], desc: 'Choose a player. Existing flag-only commands default to OwnTV.' },
  install: { type: 'boolean', desc: 'Install or update the selected player and open it.' },
  uninstall: { type: 'boolean', desc: 'Remove the selected player and its saved library.' },
  yes: { type: 'boolean', desc: 'For scripts; --install or --uninstall is still required.' },
};

function printPlaylistSteps() {
  print(chalk.bold.white('\nTo add free live TV and sports in OwnTV:\n'));
  print('  1. Go through its first screens, which ask for a profile name, to Add a playlist and choose Remote.');
  print(chalk.gray('     Later on it is under Settings > Sources & guide > Playlists > Add Source > Remote.'));
  print('  2. Open the address the TV shows in a browser on any device on the same Wi-Fi, or scan its QR code');
  print('     with a phone, and enter the PIN from the TV.');
  print('  3. Choose M3U / M3U8 and paste:');
  print(`\n     ${chalk.green(IPTV_PLAYLIST)}\n`);
  print('  4. Press Send to TV, then Start Import on the TV.\n');
  print('  In Settings > Sources & guide > EPG Sources, add both guide feeds and select a six-hour refresh:');
  for (const url of IPTV_GUIDES) print(`     ${chalk.green(url)}`);
  print('\n  Movies and series require a provider that includes on-demand content.\n');
  print(chalk.gray('The channels are links to publicly available streams collected by iptv-org.\n'));
}

/**
 * @param {string} ip
 * @returns {Promise<void>}
 */
async function install(ip, app = OWNTV) {
  const spinner = startSpinner(`Installing ${app.name}`);
  const result = await installLauncherApp(ip, app);
  if (!result.ok) {
    spinner.fail(`${app.name}: ${result.error}.`);
    markFailed();
    return;
  }
  spinner.succeed(`${app.name} installed.`);
  if (!(await openApp(ip, app.pkg))) {
    print(chalk.yellow(`\nThe TV did not open ${app.name}. Open it from the TV's apps.`));
  }
  if (app === FIRE_IPTV) {
    print(chalk.green('\nThe free live TV catalog and guide feeds are prepared on first launch.'));
    print('  Open Discover for TV guide, sports, search, and Tubi or Plex shortcuts.');
    print('  Choose Add provider to connect your own movie and series library.\n');
  } else {
    printPlaylistSteps();
  }
}

/**
 * @param {string} ip
 * @returns {Promise<void>}
 */
async function uninstall(ip, app = OWNTV) {
  if (!(await listPackages(ip)).includes(app.pkg)) {
    print(chalk.gray(`\n${app.name} is not installed.\n`));
    return;
  }
  if (await uninstallPackage(ip, app.pkg)) {
    print(chalk.green(`\n${app.name} and its playlists were removed.\n`));
  } else {
    print(chalk.red(`\n${app.name} could not be removed. It may still be installed.\n`));
    markFailed();
  }
}

const ACTIONS = { install, uninstall };

/**
 * Install, open or remove the selected IPTV player.
 * @param {string} ip
 * @param {{app?: string, install?: boolean, uninstall?: boolean, yes?: boolean}} [flags]
 * @returns {Promise<void>}
 */
export async function manageIptv(ip, flags = {}) {
  if (flags.install && flags.uninstall) {
    print(chalk.red('\nChoose either --install or --uninstall.\n'));
    markFailed();
    return;
  }
  if (flags.install || flags.uninstall) {
    const app = IPTV_APPS.find((entry) => entry.id === flags.app) || OWNTV;
    await ACTIONS[flags.install ? 'install' : 'uninstall'](ip, app);
    return;
  }
  if (flags.yes) {
    print(chalk.red('\n--yes alone does not pick anything. Pass --install or --uninstall.\n'));
    markFailed();
    return;
  }

  const installed = await listPackages(ip);
  explainStep({
    title: 'Step: TV guide, sports, movies and shows',
    body: [
      'fire-iptv prepares free live TV and guide feeds automatically.',
      'OwnTV is also available for your own IPTV provider or a starter playlist.',
      'Movies and shows depend on the content supplied by your provider.',
      'Both downloads are checked against a pinned checksum before installation.',
    ],
    reversible: true,
    standaloneCommand: 'firetv-iptv',
  });

  const choices = [];
  for (const app of IPTV_APPS.filter((entry) => !flags.app || entry.id === flags.app)) {
    const isInstalled = installed.includes(app.pkg);
    const suffix = app === FIRE_IPTV ? ' with automatic live TV setup (recommended)' : ' and show the playlist to add';
    choices.push({ name: `${isInstalled ? 'Update' : 'Install'} ${app.name}${suffix}`, value: `${app.id}:install` });
    if (isInstalled) {
      choices.push({ name: `Remove ${app.name} and its playlists`, value: `${app.id}:uninstall` });
    }
  }
  await runWizard({
    steps: [{ key: 'action', prompt: () => select({ message: 'What would you like to do?', choices }) }],
    buildSummary: (answers) => [{ label: choices.find((c) => c.value === answers.action).name }],
    onConfirm: (answers) => {
      const [id, action] = answers.action.split(':');
      return ACTIONS[action](ip, IPTV_APPS.find((entry) => entry.id === id));
    },
  });
}
