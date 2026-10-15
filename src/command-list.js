import chalk from 'chalk';
import { renderBanner } from './banner.js';
import { isInstalled } from './device-config.js';
import { print } from './output.js';

/** The areas the command table is grouped into, in the order they are shown. */
export const GROUPS = ['Setup and help', 'Alexa deep-sleep fix', 'Screensavers', 'Home screen and apps', 'Timeouts', 'Guard', 'Revert and remove'];

/**
 * Every command this package installs, and what it does. Kept in sync with
 * package.json's "bin" field by test/command-list.test.js, which diffs the
 * two, so this can never silently drift out of date.
 */
export const COMMANDS = [
  { group: 'Setup and help', name: 'fire-tv-toolkit', desc: 'Runs the full guided installer: adb, device setup, Alexa fix, screensavers, timeouts and optimizing.' },
  { group: 'Revert and remove', name: 'firetv-revert', desc: 'Puts the TV back how it was, item by item. Keeps these commands installed; see uninstall.' },
  { group: 'Setup and help', name: 'firetv-install-adb', desc: 'Installs adb (Android SDK Platform Tools) if it is not already on your machine.' },
  { group: 'Alexa deep-sleep fix', name: 'enable-alexa-fix', desc: 'Turns on the Alexa deep-sleep fix by itself.' },
  { group: 'Alexa deep-sleep fix', name: 'disable-alexa-fix', desc: 'Reverts the Alexa deep-sleep fix back to the factory default.' },
  { group: 'Screensavers', name: 'firetv-screensavers', desc: 'Installs or removes the ad-free screensavers, by itself.' },
  { group: 'Screensavers', name: 'firetv-set-screensaver', desc: 'Chooses which installed screensaver is active, by itself.' },
  { group: 'Screensavers', name: 'screensaver', desc: 'Short for firetv-set-screensaver: chooses which installed screensaver is active.' },
  { group: 'Home screen and apps', name: 'firetv-launcher', desc: 'Installs the optional AT4K or LTvLauncher home screen and switches the Home button between them and the Amazon menu.' },
  { group: 'Home screen and apps', name: 'firetv-ltv-notifications', desc: 'Lets LTvLauncher read notifications, which Android TV only allows over adb. --off turns it off.' },
  { group: 'Home screen and apps', name: 'firetv-ltv-backup', desc: 'Copies an LTvLauncher backup exported on the TV to this computer. --pull=<file> takes the newest.' },
  { group: 'Home screen and apps', name: 'firetv-iptv', desc: 'Installs OwnTV, a free IPTV player, opens it and shows the iptv-org playlist of US channels to add. --uninstall removes it.' },
  { group: 'Home screen and apps', name: 'launcher', desc: 'Short for firetv-launcher: installs AT4K or LTvLauncher, or switches the Home button.' },
  { group: 'Screensavers', name: 'firetv-optimize', desc: 'Checks the TV for settings that stop or spoil screensavers and fixes only those it has. firetv-revert puts them back.' },
  { group: 'Screensavers', name: 'optimize', desc: 'Short for firetv-optimize: sets the TV up for screensavers.' },
  { group: 'Guard', name: 'firetv-guard', desc: 'Keeps Amazon from undoing your setup: Home Redirect puts the screensaver, Alexa fix, Home and timeouts back, and updaters are held back. --check, --off.' },
  { group: 'Guard', name: 'guard', desc: 'Short for firetv-guard: keeps Amazon from undoing your setup.' },
  { group: 'Timeouts', name: 'firetv-timeouts', desc: 'Review, edit, and/or reset any of the TV timeouts, all in one guided flow.' },
  { group: 'Timeouts', name: 'firetv-timeout-sleep', desc: 'Changes the sleep (deep-sleep/standby) timeout by itself.' },
  { group: 'Timeouts', name: 'firetv-timeout-screensaver', desc: 'Changes the screensaver timeout by itself.' },
  { group: 'Timeouts', name: 'firetv-timeouts-reset', desc: 'Resets one, several (--only=), or all (--all) timeouts back to their first-observed baseline.' },
  { group: 'Timeouts', name: 'firetv-timeouts-possible', desc: 'Reports which timeouts this specific TV actually supports right now.' },
  { group: 'Timeouts', name: 'firetv-timeouts-current', desc: 'Reports the current value and captured baseline for every known timeout.' },
  { group: 'Setup and help', name: 'info', desc: 'Lists every command installed and what it does, with the banner. Does not change or start anything.' },
  { group: 'Setup and help', name: 'information', desc: 'Alias for info: lists every command installed and what it does, with the banner.' },
  { group: 'Setup and help', name: 'guide', desc: 'Alias for info: lists every command installed and what it does, with the banner.' },
  { group: 'Setup and help', name: 'start', desc: 'Opens the guided menu. Runs setup if nothing is installed yet, or hands off to update if it already is.' },
  { group: 'Setup and help', name: 'update', desc: 'Re-runs setup, overriding what is already installed. Runs plain setup instead if nothing is installed yet.' },
  { group: 'Setup and help', name: 'firetv', desc: 'Alias for info: lists every command installed and what it does, with the banner.' },
  { group: 'Revert and remove', name: 'uninstall', desc: 'First offers to put the TV back how it was, then removes these commands, resets .env, and offers to delete the repo.' },
  { group: 'Revert and remove', name: 'delete', desc: 'Permanently deletes this repo from your machine, after a typed "confirm". Does not touch the TV.' },
  { group: 'Revert and remove', name: 'remove', desc: 'Alias for delete: permanently deletes this repo from your machine, after a typed "confirm".' },
];

/**
 * Pure: text split into lines of at most width characters, breaking between
 * words. A single word longer than width gets a line of its own.
 * @param {string} text
 * @param {number} width
 * @returns {string[]}
 */
export function wrapWords(text, width) {
  const lines = [];
  let line = '';
  for (const word of text.split(' ')) {
    if (line && line.length + 1 + word.length > width) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  return [...lines, line];
}

const PLAIN = { name: (s) => s, desc: (s) => s, group: (s) => s, border: (s) => s };

/**
 * Pure: COMMANDS as a bordered table with Command and What it does columns,
 * grouped by area and fitted to width by wrapping the descriptions.
 * @param {number} width the terminal width to fit
 * @param {typeof PLAIN} [paint] colors for each part, plain text by default
 * @returns {string[]} the table's lines
 */
export function renderCommandTable(width, paint = PLAIN) {
  const nameWidth = Math.max('Command'.length, ...COMMANDS.map((c) => c.name.length));
  const descWidth = Math.max(20, width - nameWidth - 7);
  const rule = (left, mid, right) => paint.border(`${left}${'─'.repeat(nameWidth + 2)}${mid}${'─'.repeat(descWidth + 2)}${right}`);
  const bar = paint.border('│');
  const row = (name, desc) => `${bar} ${paint.name(name.padEnd(nameWidth))} ${bar} ${paint.desc(desc.padEnd(descWidth))} ${bar}`;

  const lines = [rule('┌', '┬', '┐'), `${bar} ${'Command'.padEnd(nameWidth)} ${bar} ${'What it does'.padEnd(descWidth)} ${bar}`];
  for (const group of GROUPS) {
    lines.push(rule('├', '┴', '┤'), `${bar} ${paint.group(group.padEnd(nameWidth + descWidth + 3))} ${bar}`, rule('├', '┬', '┤'));
    for (const { name, desc } of COMMANDS.filter((c) => c.group === group)) {
      wrapWords(desc, descWidth).forEach((part, i) => lines.push(row(i === 0 ? name : '', part)));
    }
  }
  lines.push(rule('└', '┴', '┘'));
  return lines;
}

/**
 * Prints COMMANDS as a table fitted to the terminal.
 */
export function printCommandList() {
  print(chalk.bold.white('Commands installed:\n'));
  const width = Math.min(process.stdout.columns || 100, 120);
  const paint = { name: chalk.green, desc: chalk.gray, group: chalk.bold.white, border: chalk.dim };
  for (const line of renderCommandTable(width, paint)) {
    print(line);
  }
  print('');
}

/**
 * The full `info` screen, shared by `info` and `firetv` (a true alias, not
 * just similar behavior). Banner first, always. If setup has never
 * completed, only the command that starts setup is shown, since nothing
 * else will work yet; otherwise the full command list is shown.
 */
export function printInfoScreen() {
  renderBanner();

  if (!isInstalled()) {
    print(chalk.yellow('Fire TV Toolkit is not installed yet. Nothing else will work until you run:\n'));
    const start = COMMANDS.find((c) => c.name === 'start');
    print(`  ${chalk.green(start.name)}  ${chalk.gray(start.desc)}\n`);
    print(chalk.gray('Once installed, this command will change to list every app command instead.\n'));
    return;
  }

  printCommandList();
}
