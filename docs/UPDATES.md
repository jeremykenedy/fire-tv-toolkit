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

## Private Fire TV UI

Keep the repository private. Authenticate on the computer using `gh auth login`, `GH_TOKEN` or `GITHUB_TOKEN` with repository access. No token is copied to the TV or written into update metadata.

A checked UI update is sent to the TV's fixed Downloads handoff files. The UI's DUMP-protected receiver verifies the package, published hash, byte count, current signing certificate and higher version code before acknowledging it. Open **Advanced > Updates** on the TV to confirm normal Android installation. The UI must already include this update screen; an older UI rejects the handoff rather than silently installing. Handoff metadata expires after six hours.

## Toolkit itself

CLI self-update supports a clean `main` Git checkout with the reviewed upstream origin. It fetches published tags, verifies the selected release commit belongs to remote `main`, fast-forwards the checkout, installs locked dependencies, and refreshes the CLI links. Local changes, another branch, a foreign origin or a non-fast-forward update stop the action. Ignored local `.env` settings are retained. Dependency or link failures are reported; inspect the error before retrying.

The desktop action downloads the matching operating-system installer and checks its published SHA256SUMS entry and size before opening it. Complete the installer yourself, then reopen Toolkit and check its displayed version. Opening the installer is not an installation success claim. Desktop user settings are retained by the normal installer.
