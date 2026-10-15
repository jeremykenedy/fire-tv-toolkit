import chalk from 'chalk';
import { select } from '../prompts.js';
import { explainStep } from '../ui.js';
import { runWizard } from '../wizard.js';
import { startSpinner } from '../spinner.js';
import { listPackages } from '../adb.js';
import { ltvNotificationsOn, setLtvNotifications } from '../apply/ltv.js';
import { LTV } from '../launcher-registry.js';
import { markFailed } from '../exit-status.js';
import { print } from '../output.js';

export const FLAG_SPEC = {
  off: { type: 'boolean', desc: 'Stop LTvLauncher reading notifications.' },
  yes: { type: 'boolean', desc: 'Allow it without asking.' },
};

/**
 * Turns LTvLauncher's notification access on or off and reports the result.
 * @param {string} ip
 * @param {boolean} on
 * @returns {Promise<boolean>} whether the TV took the change
 */
export async function applyLtvNotifications(ip, on) {
  const spinner = startSpinner(on ? 'Allowing LTvLauncher notification access' : 'Turning off LTvLauncher notification access');
  if (await setLtvNotifications(ip, on)) {
    spinner.succeed(on ? 'LTvLauncher can now read notifications.' : 'LTvLauncher notification access is off.');
    return true;
  }
  spinner.fail('The TV did not save LTvLauncher\'s notification access. Check that ADB debugging is still on and try again.');
  markFailed();
  return false;
}

/**
 * `firetv-ltv-notifications`: grants or removes LTvLauncher's notification
 * access, which Android TV only allows over adb.
 * @param {string} ip
 * @param {{off?: boolean, yes?: boolean}} [flags]
 * @returns {Promise<void>}
 */
export async function manageLtvNotifications(ip, flags = {}) {
  if (!(await listPackages(ip)).includes(LTV.pkg)) {
    print(chalk.red('\nLTvLauncher is not installed. Run launcher --install-ltv first.\n'));
    markFailed();
    return;
  }
  if (flags.off || flags.yes) {
    await applyLtvNotifications(ip, !flags.off);
    return;
  }

  const on = await ltvNotificationsOn(ip);
  explainStep({
    title: 'Step: LTvLauncher notifications',
    body: [
      'LTvLauncher can show notifications from other apps on its home screen.',
      'Android TV has no settings screen for allowing that, so it is granted',
      'over adb.',
      '',
      `Right now LTvLauncher ${on ? 'can' : 'cannot'} read notifications.`,
    ],
    settingChanged: 'secure enabled_notification_listeners',
    reversible: true,
    standaloneCommand: 'firetv-ltv-notifications',
  });

  const choices = [on
    ? { name: 'Turn off LTvLauncher notification access', value: false }
    : { name: 'Allow LTvLauncher to read notifications', value: true }];
  await runWizard({
    steps: [{ key: 'on', prompt: () => select({ message: 'What would you like to do?', choices }) }],
    buildSummary: (answers) => [{ label: choices.find((c) => c.value === answers.on).name }],
    onConfirm: (answers) => applyLtvNotifications(ip, answers.on),
  });
}
