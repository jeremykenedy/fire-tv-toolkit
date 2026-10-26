// Fire TV UI is the recommended Home screen and uses its own routing.
// AT4K and LTvLauncher use the separate Home Redirect app. Recommendation
// affects menu order; installation never chooses a different Home screen.

/** AT4K comes from its author's own release, never a copy, checked against this pinned hash. */
export const AT4K = {
  id: 'at4k',
  name: 'AT4K Launcher',
  pkg: 'com.overdevs.at4k',
  service: 'com.overdevs.at4k/com.overdevs.at4k.Hra',
  repo: 'avadhesh18/at4k',
  tag: 'v1.2',
  asset: 'app-release.apk',
  sha256: 'ac34c0abf1ceee5d5133dc3e99bde9173a00c5a16132852507ed23c0fbd41341',
};

/**
 * LTvLauncher publishes no checksum, so this release's universal APK is pinned
 * by tag and hash. It runs on 32 and 64-bit Fire TVs and has no internet
 * permission.
 */
export const LTV = {
  id: 'ltv',
  name: 'LTvLauncher',
  pkg: 'com.leanbitlab.ltvL',
  repo: 'leanbitlab-org/LtvLauncher',
  tag: 'v2026.10.03',
  asset: 'LTvLauncher-universal-release.apk',
  sha256: '9ec0dd7941642ed68ace39d013890e360dfa77c0eeb1ab9589097626be99f459',
  // Android TV has no screen for granting notification access, so adb grants it.
  notificationListener: 'com.leanbitlab.ltvL/com.leanbitlab.ltvL.LauncherNotificationListenerService',
};

/**
 * The newest release with a Home Redirect APK attached. Move it to the new
 * tag whenever a release attaches a newer build.
 */
const HOME_REDIRECT_RELEASE = 'v3.9.1';

/** Built from android/home-redirect and attached to HOME_REDIRECT_RELEASE. */
export const HOME_REDIRECT = {
  id: 'home-redirect',
  name: 'Home Redirect and Screensaver Picker',
  pkg: 'com.jeremykenedy.firetv.homeredirect',
  service: 'com.jeremykenedy.firetv.homeredirect/com.jeremykenedy.firetv.homeredirect.HomeRedirectService',
  repo: 'jeremykenedy/fire-tv-toolkit',
  tag: HOME_REDIRECT_RELEASE,
  asset: 'firetv-home-redirect.apk',
  updateAssetHistory: true,
  inspectUpdateVersion: true,
  grants: ['android.permission.WRITE_SECURE_SETTINGS'],
};

/** Public, signed native UI; its own HomeControl replaces the legacy redirect. */
export const FIRE_TV_UI = {
  id: 'fire-tv-ui',
  name: 'Fire TV UI',
  recommended: true,
  pkg: 'com.jeremykenedy.firetv.ui',
  service: 'com.jeremykenedy.firetv.ui/com.jeremykenedy.firetv.ui.HomeRedirectService',
  controlsService: 'com.jeremykenedy.firetv.ui/com.jeremykenedy.firetv.ui.Hra',
  repo: 'jeremykenedy/fire-tv-ui',
  tag: 'v1.10.1',
  asset: 'fire-tv-ui-1.10.1.apk',
  sha256: 'ab7b501954f23f9bbc1f4f3e8bab8580afcfd4be9a0f853003d300841a131dc1',
  grants: ['android.permission.WRITE_SECURE_SETTINGS'],
};

export const LAUNCHER_APPS = [FIRE_TV_UI, AT4K, HOME_REDIRECT];

/** Available Home screens; launcherApps supplies each entry's dependencies. */
export const HOME_LAUNCHERS = [FIRE_TV_UI, AT4K, LTV];

/** Home Redirect version that can open a launcher other than AT4K. */
export const HOME_TARGET_VERSION = '1.2.5';

/**
 * @param {string} id a launcher id from HOME_LAUNCHERS
 * @returns {Array<typeof AT4K | typeof HOME_REDIRECT>} the apps that launcher needs
 */
export function launcherApps(id) {
  if (id === FIRE_TV_UI.id) return [FIRE_TV_UI];
  return [HOME_LAUNCHERS.find((app) => app.id === id), HOME_REDIRECT];
}
