# Fire TV Toolkit 4.8.0

Check whether a selected TV is ready for a future independent Fire TV UI release before changing its apps or Home screen. The CLI and desktop app show the current target, setup requirements and recovery steps. This release adds planning tools; it does not install the source UI or switch Home during a preflight.

## Upgrade guide

Desktop users on 4.7.4 can replace the app with the matching 4.8.0 installer. Quit the previous app and retain its Application Support data for named TVs, favorites and restoration history. Older 4.x installations use the same replacement path; the [4.7.0 upgrade guide](https://github.com/jeremykenedy/fire-tv-toolkit/blob/v4.7.0/docs/RELEASE-4.7.0.md) covers earlier source installations.

A clean primary branch CLI checkout can run:

```sh
firetv-updates --self --install toolkit --yes
```

The updater fast forwards clean `main`, runs `npm ci` and refreshes `npm link`. It preserves ignored `.env` configuration and custom sources, and refuses dirty or non-primary checkouts. No profile migration, new account, TV app update or reboot is required.

To use the new preflight, connect the selected TV through the existing ADB setup. In the desktop app, open **Home & live TV** under **Fire TV tools**, then choose **Check setup and recovery** under **Independent Fire TV UI setup**. The result names the connected profile and TV, shows the current Home choice, and lists prerequisites and recovery steps. Switching profiles clears the previous result.

The CLI equivalent uses the configured TV:

```sh
firetv-launcher --source-ui
```

Developers reviewing an independent production release contract can supply its local JSON path:

```sh
firetv-launcher --source-ui --artifact-contract /path/to/source-release.json
```

Use these flags separately from installation and Home selection flags. The optional contract is a declaration for review, not approval to install. Preflight remains read-only whether a contract is supplied or not.

## Breaking changes

None. Existing app identities, saved TV profiles, launcher choices and companion installation pins remain unchanged. CLI Node 18+ and desktop source Node 22.13+ requirements are unchanged. No dependency or preference schema changes are introduced.

## Major changes

- Independent UI preflight checks TV identity, reported Android API level, TV capability, installed UI version and current Home configuration. It explains what still needs verification before an in-place upgrade.
- Desktop preflight follows the connected named TV and rejects a stale or changed target. A busy operation cannot run it against a different profile. Results include setup stages and practical Factory Home recovery guidance.
- Optional local contract inspection checks file size, SHA-256 and the APK's compiled package and version against the supplied declaration. It does not verify the actual signing certificate, source authorship or published release approval. Those states remain explicit, and installation is unavailable from this route.

## Minor changes and fixes

- CLI parsing rejects conflicting installation or Home flags on the preflight route, including an empty artifact-contract argument.
- Desktop results are cleared on target changes so a previous TV's plan cannot be mistaken for the current connection.
- Launcher state recognition and failure restoration understand an explicitly selected source helper Fire TV UI target while retaining existing alternative-launcher defaults.
- The desktop lockfile's bundled CLI metadata now matches the host version and includes the existing published-updates command.

## Companion versions and source UI limits

The reviewed Fire TV UI installation pin remains [1.17.0/code78](https://github.com/jeremykenedy/fire-tv-ui/releases/tag/v1.17.0) with its existing icon archive. Home Redirect remains the verified [1.2.6/code10 APK attached to Toolkit 3.9.1](https://github.com/jeremykenedy/fire-tv-toolkit/releases/tag/v3.9.1). Other companion pins are unchanged.

Prepared Home Redirect source accepts an explicit Fire TV UI target, keeps AT4K as its absent/unknown default and preserves explicit LTvLauncher choices. That changed helper is not published with this host release. No new helper APK is attached, and existing installations are not silently replaced.

The independent UI preview still needs complete parity, migration, recovery and native hardware acceptance before it can replace the production launcher. A matching local contract or successful preflight does not close those gates. Installing the existing published UI remains a separate action and does not establish source independence.

## Verification and limits

The versioned host passed all 513 CLI tests, including preflight contract checks, flag conflicts and saved-TV recovery. Desktop integration passed 59 unit tests, lint and an actual Electron check of the selected-profile preflight route and profile-switch result clearing. Final packaged screenshots and their provenance are linked from the [screenshot gallery](https://github.com/jeremykenedy/fire-tv-toolkit/blob/v4.8.0/docs/SCREENSHOTS.md).

Required publication CI covers Node 18/20, native macOS/Windows/Linux desktop packages and the documentation site on the exact primary release commit. The new helper's native routing and production source UI acceptance are outside this host release. Desktop installers retain their unsigned status and existing macOS Gatekeeper limitation.

## Rollback and recovery

Keep the previous verified host installer and app-data directory. Replace the host app without resetting saved profiles, Fire TV baselines or installed companions. The new preflight writes no TV settings, so running it requires no TV-side rollback.

If a later, separately chosen Home switch fails, reconnect to the same identified TV and use the existing Factory Home command:

```sh
firetv-launcher --use=amazon
```

This is a recovery action that changes Home selection; preflight only displays it. Keep the installed UI and its private data if a future in-place update fails. Do not uninstall it or assume Android will permit a lower-version APK as rollback.

[Launcher guide](https://github.com/jeremykenedy/fire-tv-toolkit/blob/v4.8.0/docs/LAUNCHER.md) | [Desktop guide](https://github.com/jeremykenedy/fire-tv-toolkit/blob/v4.8.0/docs/DESKTOP.md) | [Compare 4.7.4 to 4.8.0](https://github.com/jeremykenedy/fire-tv-toolkit/compare/v4.7.4...v4.8.0).
