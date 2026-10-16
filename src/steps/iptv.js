import chalk from 'chalk';
import { select } from '../prompts.js';
import { explainStep } from '../ui.js';
import { runWizard } from '../wizard.js';
import { startSpinner } from '../spinner.js';
import { listPackages, uninstallPackage, openApp } from '../adb.js';
import { installLauncherApp } from '../apply/launcher.js';
import { OWNTV, IPTV_PLAYLIST } from '../iptv-registry.js';
import { markFailed } from '../exit-status.js';
import { print } from '../output.js';

export const FLAG_SPEC = {
  install: { type: 'boolean', desc: 'Install or update OwnTV, open it, and show the playlist to add.' },
  uninstall: { type: 'boolean', desc: 'Remove OwnTV and the playlists saved in it.' },
  yes: { type: 'boolean', desc: 'For scripts; --install or --uninstall is still required.' },
};

function printPlaylistSteps() {
  print(chalk.bold.white('\nTo add the free worldwide channels in OwnTV:\n'));
  print('  1. Go through its first screens, which ask for a profile name, to Add a playlist and choose Remote.');
  print(chalk.gray('     Later on it is under Settings > Sources & guide > Playlists > Add Source > Remote.'));
  print('  2. Open the address the TV shows in a browser on any device on the same Wi-Fi, or scan its QR code');
  print('     with a phone, and enter the PIN from the TV.');
  print('  3. Choose M3U / M3U8 and paste:');
  print(`\n     ${chalk.green(IPTV_PLAYLIST)}\n`);
  print('  4. Press Send to TV, then Start Import on the TV.\n');
  print(chalk.gray('The channels are links to publicly available streams collected by iptv-org.\n'));
}

/**
 * @param {string} ip
 * @returns {Promise<void>}
 */
async function install(ip) {
  const spinner = startSpinner(`Installing ${OWNTV.name}`);
  const result = await installLauncherApp(ip, OWNTV);
  if (!result.ok) {
    spinner.fail(`${OWNTV.name}: ${result.error}.`);
    markFailed();
    return;
  }
  spinner.succeed(`${OWNTV.name} installed.`);
  if (!(await openApp(ip, OWNTV.pkg))) {
    print(chalk.yellow(`\nThe TV did not open ${OWNTV.name}. Open it from the TV's apps.`));
  }
  printPlaylistSteps();
}

/**
 * @param {string} ip
 * @returns {Promise<void>}
 */
async function uninstall(ip) {
  if (!(await listPackages(ip)).includes(OWNTV.pkg)) {
    print(chalk.gray(`\n${OWNTV.name} is not installed.\n`));
    return;
  }
  if (await uninstallPackage(ip, OWNTV.pkg)) {
    print(chalk.green(`\n${OWNTV.name} and its playlists were removed.\n`));
  } else {
    print(chalk.red(`\n${OWNTV.name} could not be removed. It may still be installed.\n`));
    markFailed();
  }
}

const ACTIONS = { install, uninstall };

/**
 * `firetv-iptv`: installs OwnTV, a free IPTV player, opens it and shows the
 * iptv-org playlist to add, or removes it again.
 * @param {string} ip
 * @param {{install?: boolean, uninstall?: boolean, yes?: boolean}} [flags]
 * @returns {Promise<void>}
 */
export async function manageIptv(ip, flags = {}) {
  if (flags.install && flags.uninstall) {
    print(chalk.red('\nChoose either --install or --uninstall.\n'));
    markFailed();
    return;
  }
  if (flags.install || flags.uninstall) {
    await ACTIONS[flags.install ? 'install' : 'uninstall'](ip);
    return;
  }
  if (flags.yes) {
    print(chalk.red('\n--yes alone does not pick anything. Pass --install or --uninstall.\n'));
    markFailed();
    return;
  }

  const installed = (await listPackages(ip)).includes(OWNTV.pkg);
  explainStep({
    title: 'Step: Free live TV with OwnTV',
    body: [
      'OwnTV is a free, open source IPTV player for Android TV. This installs',
      'it from its author\'s own release, checked against a pinned hash, and',
      'opens it. You then add the iptv-org worldwide channel playlist',
      'from your phone; the steps and the URL are shown after the install.',
    ],
    reversible: true,
    standaloneCommand: 'firetv-iptv',
  });

  const choices = [{ name: `${installed ? 'Update' : 'Install'} OwnTV and show the playlist to add`, value: 'install' }];
  if (installed) {
    choices.push({ name: 'Remove OwnTV and its playlists', value: 'uninstall' });
  }
  await runWizard({
    steps: [{ key: 'action', prompt: () => select({ message: 'What would you like to do?', choices }) }],
    buildSummary: (answers) => [{ label: choices.find((c) => c.value === answers.action).name }],
    onConfirm: (answers) => ACTIONS[answers.action](ip),
  });
}
