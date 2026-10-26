import { getSetting, putSetting, deleteSetting, listPackages, listDisabledPackages, enablePackage, disablePackage, grantPermission, installApk, uninstallPackage, pressHome, describeAdbError, sendGuard, setNativeUiHome, nativeUiHomePreference, packageDetails } from '../adb.js';
import { downloadApk, removeDownload } from './screensavers.js';
import { AT4K, LTV, FIRE_TV_UI, HOME_REDIRECT, HOME_LAUNCHERS, launcherApps, UI_HOME_MIN_CODE } from '../launcher-registry.js';

const SERVICES_KEY = 'enabled_accessibility_services';
const ENABLED_KEY = 'accessibility_enabled';
const KNOWN_APPS = [FIRE_TV_UI, AT4K, LTV, HOME_REDIRECT];

/**
 * Pure: the colon-separated accessibility services setting as a list. The TV
 * reports an unset value as the text "null".
 * @param {string | null} raw
 * @returns {string[]}
 */
export function parseServices(raw) {
  if (!raw || raw === 'null') {
    return [];
  }
  return raw.split(':').map((s) => s.trim()).filter(Boolean);
}

/**
 * Pure: the services list with a launcher's home screen switched on or off.
 * Any other accessibility service the TV already runs is left exactly as it
 * was. AT4K's own service stays on when going back to Amazon; only Home
 * Redirect decides where the Home button goes. It is switched off for
 * LTvLauncher, so it cannot pull Home back to AT4K.
 * @param {string[]} current
 * @param {'fire-tv-ui' | 'at4k' | 'ltv' | 'amazon'} mode
 * @returns {string[]}
 */
export function servicesFor(current, mode) {
  const replaced = [FIRE_TV_UI.service, FIRE_TV_UI.controlsService, HOME_REDIRECT.service, 'com.overdevs.at4khelper/com.overdevs.at4khelper.HomeRedirectAccessibilityService'];
  const others = current.filter((s) => !replaced.includes(s) && (![LTV.id, FIRE_TV_UI.id].includes(mode) || s !== AT4K.service));
  if (mode === 'amazon') {
    return others;
  }
  if (mode === FIRE_TV_UI.id) {
    return [...others, FIRE_TV_UI.controlsService, FIRE_TV_UI.service];
  }
  if (mode === LTV.id) {
    return [...others, HOME_REDIRECT.service];
  }
  const withAt4k = others.includes(AT4K.service) ? others : [...others, AT4K.service];
  return [...withAt4k, HOME_REDIRECT.service];
}

/**
 * Asks Home Redirect which launcher it opens, or tells it to open another.
 * A Home Redirect older than 1.2.5 only knows AT4K and replies "unknown".
 * @param {string} ip
 * @param {string} [value] 'at4k' or 'ltv' to change it
 * @returns {Promise<string | null>} the reply, such as "home=ltv"
 */
async function homeTarget(ip, value) {
  try {
    return await sendGuard(ip, 'home', value ? { value } : {});
  } catch {
    return null;
  }
}

/**
 * @param {string} ip
 * @returns {Promise<{installed: string[], disabled: string[], services: string[], home: 'fire-tv-ui' | 'at4k' | 'ltv' | 'amazon'}>}
 */
export async function launcherState(ip) {
  const packages = await listPackages(ip);
  const disabled = await listDisabledPackages(ip);
  const ui = packages.includes(FIRE_TV_UI.pkg) ? await packageDetails(ip, FIRE_TV_UI.pkg) : null;
  const services = parseServices(await getSetting(ip, 'secure', SERVICES_KEY));
  let home = 'amazon';
  if (packages.includes(FIRE_TV_UI.pkg) && !disabled.includes(FIRE_TV_UI.pkg) && services.includes(FIRE_TV_UI.service) && services.includes(FIRE_TV_UI.controlsService)
      && await getSetting(ip, 'secure', ENABLED_KEY) === '1') {
    home = FIRE_TV_UI.id;
  } else if (services.includes(HOME_REDIRECT.service)) {
    home = (await homeTarget(ip)) === `home=${LTV.id}` ? LTV.id : AT4K.id;
  }
  return {
    installed: KNOWN_APPS.filter((app) => packages.includes(app.pkg)).map((app) => app.id),
    disabled: KNOWN_APPS.filter((app) => disabled.includes(app.pkg)).map((app) => app.id),
    services,
    home,
    ...(ui ? { uiHomeSupported: ui.versionCode !== null && ui.versionCode >= UI_HOME_MIN_CODE } : {}),
  };
}

/**
 * @param {string} ip
 * @param {string[]} services
 */
async function writeServices(ip, services) {
  if (services.length === 0) {
    await deleteSetting(ip, 'secure', SERVICES_KEY);
    await putSetting(ip, 'secure', ENABLED_KEY, 0);
    return;
  }
  await putSetting(ip, 'secure', SERVICES_KEY, services.join(':'));
  await putSetting(ip, 'secure', ENABLED_KEY, 1);
}

/**
 * Pure: a plain-language reason for an install adb refused. The common one is
 * a copy of the app already on the TV signed by someone else, which Android
 * will not replace.
 * @param {unknown} err
 * @returns {string}
 */
export function explainInstallFailure(err) {
  const text = describeAdbError(err);
  if (/INSTALL_FAILED_UPDATE_INCOMPATIBLE|signatures do not match/i.test(text)) {
    return 'a different build of this app is already installed, signed by someone else, so Android will not replace it. Your copy was left as it is';
  }
  return text;
}

/**
 * Downloads, verifies and installs one launcher app, then switches it back on
 * if it had been disabled and grants the permissions it needs.
 * @param {string} ip
 * @param {typeof AT4K | typeof HOME_REDIRECT} app
 * @returns {Promise<{ok: boolean, error?: string}>}
 */
export async function installLauncherApp(ip, app) {
  let apkPath;
  let result;
  let before;
  let enabledBefore;
  let servicesBefore;
  try {
    if (app.id === FIRE_TV_UI.id && (!Number.isSafeInteger(app.versionCode) || BigInt(app.versionCode) < UI_HOME_MIN_CODE)) {
      throw new Error('Fire TV UI version code69 or later is required for safe Home preference preservation.');
    }
    apkPath = await downloadApk(app);
    if (app.id === FIRE_TV_UI.id) {
      before = await launcherState(ip);
      enabledBefore = await getSetting(ip, 'secure', ENABLED_KEY);
      servicesBefore = await getSetting(ip, 'secure', SERVICES_KEY);
    }
    await installApk(ip, apkPath);
    await enablePackage(ip, app.pkg);
    if (before) {
      const installed = await packageDetails(ip, FIRE_TV_UI.pkg);
      if (installed.versionCode === null || installed.versionCode < UI_HOME_MIN_CODE)
        throw new Error('Installed Fire TV UI does not provide the code69 Home preservation API.');
    }
    if (!before || !before.installed.includes(FIRE_TV_UI.id)) {
      for (const permission of app.grants || []) {
        await grantPermission(ip, app.pkg, permission);
      }
    }
    if (before) {
      if (!before.installed.includes(FIRE_TV_UI.id)) await setNativeUiHome(ip, false, true);
      await restoreServices(ip, enabledBefore, servicesBefore);
    }
    result = { ok: true };
  } catch (err) {
    if (before) await restoreServices(ip, enabledBefore, servicesBefore);
    result = { ok: false, error: explainInstallFailure(err) };
  } finally {
    if (apkPath) removeDownload(apkPath);
  }
  return result;
}

/**
 * Sends Home to Fire TV UI, AT4K, LTvLauncher or the Amazon menu, then
 * presses Home so the result is on screen straight away.
 * @param {string} ip
 * @param {'fire-tv-ui' | 'at4k' | 'ltv' | 'amazon'} mode
 * @returns {Promise<boolean>} whether the TV reads back the requested mode
 */
export async function useHome(ip, mode) {
  if (mode !== 'amazon' && !HOME_LAUNCHERS.some((app) => app.id === mode)) return false;
  const before = await launcherState(ip);
  if (mode !== 'amazon' && !launcherApps(mode).every((app) => before.installed.includes(app.id))) return false;
  const enabledBefore = await getSetting(ip, 'secure', ENABLED_KEY);
  const servicesBefore = await getSetting(ip, 'secure', SERVICES_KEY);
  const hasUi = before.installed.includes(FIRE_TV_UI.id);
  let preferenceBefore;
  if (hasUi) {
    if (!before.uiHomeSupported) return false;
    try {
      preferenceBefore = await nativeUiHomePreference(ip);
    } catch {
      return false;
    }
  }
  const requested = servicesFor(before.services, mode);
  let uiChanged = false;
  const enabledApps = [];
  try {
    if (HOME_LAUNCHERS.some((app) => app.id === mode)) {
      for (const app of launcherApps(mode).filter((a) => before.disabled.includes(a.id))) {
        await enablePackage(ip, app.pkg);
        enabledApps.push(app);
      }
    }
    // Remember the choice before the native guard can repair an old Home route.
    if (hasUi) {
      await setNativeUiHome(ip, mode === FIRE_TV_UI.id, true);
      uiChanged = true;
    }
    if (mode !== FIRE_TV_UI.id && mode !== 'amazon') {
      const reply = await homeTarget(ip, mode);
      if (mode === LTV.id && reply !== `home=${LTV.id}`) throw new Error('Home Redirect needs updating.');
    }
    // These writes also update an enabled Toolkit guard's remembered route.
    await writeServices(ip, requested);
    const readBack = parseServices(await getSetting(ip, 'secure', SERVICES_KEY));
    const enabled = await getSetting(ip, 'secure', ENABLED_KEY);
    if (readBack.join(':') !== requested.join(':') || enabled !== (requested.length ? '1' : '0')) {
      throw new Error('The TV did not save the Home button setting.');
    }
    if ((await launcherState(ip)).home !== mode) throw new Error('The TV did not retain Home routing.');
    if (hasUi) await setNativeUiHome(ip, mode === FIRE_TV_UI.id);
  } catch {
    try {
      if (uiChanged) await setNativeUiHome(ip, preferenceBefore, true);
      if ([AT4K.id, LTV.id].includes(before.home) && before.home !== mode) {
        await homeTarget(ip, before.home);
      }
      await restoreServices(ip, enabledBefore, servicesBefore);
    } finally {
      for (const app of enabledApps) await disablePackage(ip, app.pkg);
    }
    return false;
  }
  await pressHome(ip);
  return true;
}

async function restoreServices(ip, enabled, raw) {
  if (raw === 'null') {
    await deleteSetting(ip, 'secure', SERVICES_KEY);
  } else {
    await putSetting(ip, 'secure', SERVICES_KEY, raw);
  }
  if (enabled === 'null') {
    await deleteSetting(ip, 'secure', ENABLED_KEY);
  } else {
    await putSetting(ip, 'secure', ENABLED_KEY, enabled);
  }
  if (await getSetting(ip, 'secure', SERVICES_KEY) !== raw
      || await getSetting(ip, 'secure', ENABLED_KEY) !== enabled) {
    throw new Error('The TV did not restore its previous accessibility settings.');
  }
}

/**
 * Uninstalls one launcher app and drops its accessibility service from the
 * TV's list, so nothing is left pointing at an app that is gone.
 * @param {string} ip
 * @param {typeof AT4K | typeof HOME_REDIRECT} app
 * @returns {Promise<boolean>} whether the app was removed
 */
export async function removeLauncherApp(ip, app) {
  if (!(await uninstallPackage(ip, app.pkg))) {
    return false;
  }
  const current = parseServices(await getSetting(ip, 'secure', SERVICES_KEY));
  if (current.includes(app.service) || current.includes(app.controlsService)) {
    await writeServices(ip, current.filter((s) => s !== app.service && s !== app.controlsService));
  }
  return true;
}
