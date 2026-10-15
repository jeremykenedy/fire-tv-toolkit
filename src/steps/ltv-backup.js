import path from 'node:path';
import chalk from 'chalk';
import { select, input } from '../prompts.js';
import { explainStep } from '../ui.js';
import { runWizard, withBack, BACK } from '../wizard.js';
import { startSpinner } from '../spinner.js';
import { listPackages } from '../adb.js';
import { listLtvBackups, pullLtvBackup } from '../apply/ltv.js';
import { destinationError } from './fire-tv-ui.js';
import { LTV } from '../launcher-registry.js';
import { markFailed } from '../exit-status.js';
import { print } from '../output.js';

export const FLAG_SPEC = {
  pull: { type: 'string', desc: 'Save the newest LTvLauncher backup on the TV to this new file.' },
};

const EXPORT_FIRST = 'In LTvLauncher, open Settings > Backup & Restore > Export Backup first, then run this again.';

/**
 * @param {string} ip
 * @param {string} name
 * @param {string} destination
 * @returns {Promise<void>}
 */
async function pull(ip, name, destination) {
  const problem = destinationError(destination);
  if (problem) {
    print(chalk.red(`\n${problem}\n`));
    markFailed();
    return;
  }
  const spinner = startSpinner(`Copying ${name} from the TV`);
  try {
    await pullLtvBackup(ip, name, path.resolve(destination));
    spinner.succeed(`Backup saved: ${path.resolve(destination)}`);
  } catch (error) {
    spinner.fail(error.message);
    markFailed();
  }
}

/**
 * `firetv-ltv-backup`: copies an LTvLauncher backup from the TV to this
 * computer. LTvLauncher only restores backups it exported itself, so restoring
 * stays in its own Backup & Restore menu.
 * @param {string} ip
 * @param {{pull?: string}} [flags]
 * @returns {Promise<void>}
 */
export async function manageLtvBackup(ip, flags = {}) {
  if (!(await listPackages(ip)).includes(LTV.pkg)) {
    print(chalk.red('\nLTvLauncher is not installed. Run launcher --install-ltv first.\n'));
    markFailed();
    return;
  }
  const backups = await listLtvBackups(ip);
  if (backups.length === 0) {
    print(chalk.yellow(`\nThere is no LTvLauncher backup on the TV yet. ${EXPORT_FIRST}\n`));
    markFailed();
    return;
  }
  if (flags.pull !== undefined) {
    await pull(ip, backups[0], flags.pull);
    return;
  }

  explainStep({
    title: 'Step: Copy an LTvLauncher backup to this computer',
    body: [
      'LTvLauncher keeps a copy of every backup you export in the TV\'s Download',
      'folder. This copies one to this computer. To make a new one, use',
      'Settings > Backup & Restore > Export Backup in LTvLauncher.',
      '',
      'To restore, use Import Backup in LTvLauncher. It only lists backups it',
      'exported itself, so a file copied back from a computer would not show up.',
    ],
    standaloneCommand: 'firetv-ltv-backup',
  });

  await runWizard({
    steps: [
      { key: 'name', prompt: () => select({ message: 'Which backup?', choices: backups.map((name, i) => ({ name: i === 0 ? `${name} (newest)` : name, value: name })) }) },
      { key: 'destination', prompt: async (state, { showBack }) => {
        const where = await select({ message: 'Where should it go?', choices: withBack([
          { name: `This folder: ${path.resolve(state.name)}`, value: state.name },
          { name: 'Somewhere else', value: '' },
        ], showBack) });
        if (where === BACK || where) {
          return where;
        }
        return input({ message: 'Save the backup on this computer as:', validate: (value) => destinationError(value) || true });
      } },
    ],
    buildSummary: (state) => [{ label: `Copy ${state.name} from the TV`, detail: path.resolve(state.destination) }],
    onConfirm: (state) => pull(ip, state.name, state.destination),
  });
}
