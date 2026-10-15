import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { getSetting, setNotificationListener, listRemoteFiles, pullFile } from '../adb.js';
import { parseServices } from './launcher.js';
import { LTV } from '../launcher-registry.js';

const LISTENERS_KEY = 'enabled_notification_listeners';

// LTvLauncher's Export Backup writes to its own folder, which adb cannot read
// on Fire OS, and also copies the file here.
export const LTV_BACKUP_DIR = '/sdcard/Download';

/**
 * @param {string} ip
 * @returns {Promise<boolean>} whether LTvLauncher may read notifications
 */
export async function ltvNotificationsOn(ip) {
  return parseServices(await getSetting(ip, 'secure', LISTENERS_KEY)).includes(LTV.notificationListener);
}

/**
 * @param {string} ip
 * @param {boolean} on
 * @returns {Promise<boolean>} whether the TV reads back the requested state
 */
export async function setLtvNotifications(ip, on) {
  await setNotificationListener(ip, LTV.notificationListener, on);
  return (await ltvNotificationsOn(ip)) === on;
}

/**
 * Pure: LTvLauncher's exported backups, newest first. Its file names carry the
 * export time, so they sort by name.
 * @param {string[]} names
 * @returns {string[]}
 */
export function ltvBackupNames(names) {
  return names.filter((name) => /^ltv_backup_\d{8}_\d{6}\.json$/.test(name)).sort((a, b) => b.localeCompare(a));
}

/**
 * @param {string} ip
 * @returns {Promise<string[]>} the backups LTvLauncher exported to the TV's Download folder, newest first
 */
export async function listLtvBackups(ip) {
  return ltvBackupNames(await listRemoteFiles(ip, LTV_BACKUP_DIR));
}

/**
 * @param {Buffer} bytes
 * @returns {boolean} whether bytes hold an LTvLauncher version 1 backup
 */
function isLtvBackup(bytes) {
  try {
    return JSON.parse(bytes.toString('utf8')).version === 1;
  } catch {
    return false;
  }
}

/**
 * Copies one backup from the TV into a private temporary folder and checks it
 * is an LTvLauncher backup there, so only a good backup is ever written to
 * the destination, and never over an existing file.
 * @param {string} ip
 * @param {string} name
 * @param {string} destination a file that does not exist yet
 * @returns {Promise<void>}
 */
export async function pullLtvBackup(ip, name, destination) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'firetv-ltv-backup-'));
  try {
    const temporary = path.join(dir, 'backup.json');
    await pullFile(ip, `${LTV_BACKUP_DIR}/${name}`, temporary);
    const bytes = fs.readFileSync(temporary);
    if (!isLtvBackup(bytes)) {
      throw new Error(`${name} did not come through as an LTvLauncher backup, so nothing was saved.`);
    }
    fs.writeFileSync(destination, bytes, { flag: 'wx', mode: 0o600 });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
