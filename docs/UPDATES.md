# Check and install published updates

The desktop sidebar includes **Check for updates**. It checks Toolkit on this computer without requiring a TV. Connect the intended television, then check installed app updates for Fire TV UI, all catalog screensavers, installed launchers and IPTV apps. Each result distinguishes installed and published versions, shows the check time and SHA-256, and reports failures as unavailable.

The CLI exposes the same tasks from the guided menu and through `firetv-updates`. `update` is an alias for this update flow.

```bash
firetv-updates --self --check
firetv-updates --self --install toolkit --yes
firetv-updates --ip 192.168.1.74 --check
firetv-updates --ip 192.168.1.74 --install pipeworks-dream --yes
firetv-updates --ip 192.168.1.74 --install fire-tv-ui --yes
```

Replace the example address with the intended TV. Explicit targeting does not overwrite the saved default TV. Checks do not install anything. Select one verified newer release and confirm its replacement. Catalog installation pins are not reported as the latest release: update checks request actual published stable release metadata and a published checksum. Missing checksums, API errors and rate limits remain unavailable.

## TV app replacement

Before an install, Toolkit verifies the published SHA-256, expected compiled Android package and a higher Android version code than the installed app. Android's replacement installer enforces the installed signing certificate and rejects incompatible downgrades. Existing app data is retained. Toolkit reads back the installed version code before reporting completion. A failed replacement is reported as failed.

## Android helpers in a desktop repository

Home Redirect shares Toolkit's repository, but its Android app version is separate from the desktop release tag. If the newest stable release has no `firetv-home-redirect.apk`, the check searches the latest 100 release entries for the most recently published stable release containing that exact asset. It never substitutes a different APK.

The check downloads the checksum-verified helper temporarily, reads its compiled package and Android version code, and removes the inspection file. It compares that code with the installed app. For example, Home Redirect 1.2.6 is attached to repository release v3.9.1; v3.9.1 is not the helper's app version. The desktop and CLI show both values. Missing assets, integrity failures and unavailable history remain failed checks.

## Fire TV UI

Fire TV UI releases are public. Checking and downloading them does not require GitHub sign-in. Optional computer authentication through `gh auth login`, `GH_TOKEN` or `GITHUB_TOKEN` can raise the GitHub API request limit. No token is copied to the TV or written into update metadata.

A checked UI update is sent to the TV's fixed Downloads handoff files. The UI's DUMP-protected receiver verifies the package, published hash, byte count, current signing certificate and higher version code before acknowledging it. Open **Advanced > Updates** on the TV to confirm normal Android installation. The UI must already include this update screen; an older UI rejects the handoff rather than silently installing. Handoff metadata expires after six hours.

## Toolkit itself

CLI self-update supports a clean `main` Git checkout with the reviewed upstream origin. It fetches published tags, verifies the selected release commit belongs to remote `main`, fast-forwards the checkout, installs locked dependencies, and refreshes the CLI links. Local changes, another branch, a foreign origin or a non-fast-forward update stop the action. Ignored local `.env` settings are retained. Dependency or link failures are reported; inspect the error before retrying.

The desktop action downloads the matching operating-system installer and checks its published SHA256SUMS entry and size before opening it. Complete the installer yourself, then reopen Toolkit and check its displayed version. Opening the installer is not an installation success claim. Desktop user settings are retained by the normal installer.
