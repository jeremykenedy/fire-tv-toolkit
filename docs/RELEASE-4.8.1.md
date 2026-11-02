# Fire TV Toolkit 4.8.1

The source UI preflight now checks the APK's actual minimum Android API level against the supplied local release contract. A mismatch stops the check before TV diagnostics, so a declaration cannot make an incompatible APK appear ready.

## Upgrade guide

Desktop users on 4.8.0 can quit the app and replace it with the matching 4.8.1 installer. Keep the application data directory to retain saved TVs, favorites and restoration history. Earlier 4.x users can use the same replacement path; see the [4.7.0 upgrade guide](https://github.com/jeremykenedy/fire-tv-toolkit/blob/v4.7.0/docs/RELEASE-4.7.0.md) for earlier source installations.

For a clean CLI checkout on `main`, run:

```sh
firetv-updates --self --install toolkit --yes
```

The updater fast forwards a clean primary checkout, installs dependencies with `npm ci` and refreshes `npm link`. It retains ignored `.env` settings and custom sources. No profile migration, account, companion update or TV reboot is required. See the [4.8.0 guide](https://github.com/jeremykenedy/fire-tv-toolkit/blob/v4.8.0/docs/RELEASE-4.8.0.md) for the read-only preflight and its optional local artifact contract.

## Breaking changes

A local source UI contract is now rejected when its declared minimum SDK differs from the compiled APK, or the APK uses an unsupported nonnumeric SDK value. Correct the contract or supply the matching APK before retrying. Existing profiles, launcher choices, companion pins and runtime requirements are unchanged. CLI requires Node 18 or later; desktop source builds require Node 22.13 or later.

## Major changes

Source UI contract inspection reads the compiled Android manifest and compares the APK's minimum SDK with the contract. The preflight checks compatibility against that verified value. It remains read-only and does not verify the APK signing certificate or approve a release for installation.

## Minor changes and fixes

- Preserve explicit alternative Home choices and saved TV profiles during preflight.
- Refresh packaged macOS desktop captures for 4.8.1 with isolated sample profiles and fake ADB.

## Companion versions and limits

The published Fire TV UI and Home Redirect pins remain unchanged. Home Redirect 1.2.7 is a separate candidate; it is not selected by the host until separately verified and published. AT4K and LTvLauncher remain optional choices. Source UI production installation and physical TV acceptance remain separate work.

## Verification and rollback

The SDK manifest and preflight regression checks cover matching and mismatched requirements, default SDK values and unsupported declarations. The packaged macOS setup flow used temporary profiles and fake ADB and preserved the selected alternative Home. Three-platform packaging and the primary-branch release checks must pass before publication. Desktop installers are unsigned and macOS Gatekeeper restrictions still apply.

Keep the previous verified installer and application data for rollback. Preflight changes no TV settings. If a separately selected Home switch needs recovery, reconnect to the same TV and run:

```sh
firetv-launcher --use=amazon
```

This changes Home selection; the preflight only displays the recovery command. Do not uninstall the existing UI or assume Android permits a lower-version APK as a rollback.

[Launcher guide](https://github.com/jeremykenedy/fire-tv-toolkit/blob/v4.8.1/docs/LAUNCHER.md) | [Desktop guide](https://github.com/jeremykenedy/fire-tv-toolkit/blob/v4.8.1/docs/DESKTOP.md) | [Compare 4.8.0 to 4.8.1](https://github.com/jeremykenedy/fire-tv-toolkit/compare/v4.8.0...v4.8.1)
