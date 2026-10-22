# Fire TV Toolkit 4.4.0

## Major changes

**Check for updates** is available in the desktop sidebar and CLI menu. It checks the current published stable release for Toolkit and each installed catalog app, including Fire TV UI, screensavers, launchers and IPTV apps. It shows the installed and published versions, check time and checksum. Failed or rate limited checks remain unavailable.

Select a checked update and confirm before replacing an app. Toolkit verifies its published checksum, Android package and higher version code; Android enforces the installed signing certificate. An installed version readback confirms completion. Existing app data stays in place.

Private Fire TV UI updates use computer authentication and a protected verified handoff. No credential goes to the TV. Confirm the normal Android installer from the TV's Advanced > Updates screen. This requires a UI version that includes that screen.

Toolkit can also update itself. CLI updates require a clean reviewed primary checkout and preserve ignored TV configuration. Desktop updates download the matching verified installer and open it for normal installation. Reopen the installed app to verify its version.

The release also refreshes the verified OwnTV installation default to 5.2.1 and Fire IPTV to 1.1.1, includes the current Pipeworks Dream 1.1 preview, and sends guarded settings through Fire TV UI's protected receiver so its protection service retains the desired state. Fire IPTV starts with automatic picture-in-picture disabled when that preference has not been set; explicit user choices survive an update.

Prism Clock joins the install catalog with its published signed 1.0.0 release and a real physical TV preview. OwnTV update checks select the APK matching the current release tag when upstream publishes several files.

## Upgrade

Install the latest desktop package, or update the verified CLI primary checkout and run `npm ci` followed by `npm link`. Saved device configuration stays in place. Read [published update checks](UPDATES.md) for explicit TV targeting, credentials, confirmation and error behavior.

Signed TV replacements retain existing application data. The selected television is shown before installation.

## Breaking changes

The `update` CLI alias now opens the published update flow. Users who previously used it for setup review can use `start` or the desktop **Guided updater** instead. The existing standalone app installation commands remain available.

There is no application data migration. CLI and desktop runtime requirements remain unchanged. An unavailable API or missing checksum prevents an update from being presented as verified.

## Minor changes and fixes

OwnTV's initial install uses its independently verified 5.2.1 APK. Fire IPTV installs the original-signer 1.1.1 release. Pipeworks Dream's catalog preview comes from its final physical Fire TV 1.1.0 output. Protected setting writes require the native receiver's success acknowledgement and a matching readback.

## Upgrade and recovery details

This is an upgrade from Toolkit 4.3.2. Earlier 4.x installations can install the current desktop package or update a clean primary CLI checkout through the same commands. No configuration keys, schema migration, cache clearing or TV reset is required.

Before updating, preserve any uncommitted source edits separately. CLI self-update refuses to discard them. Existing ignored `.env` device configuration stays local. Connect the intended TV explicitly before app updates. Private UI staging needs computer GitHub access and an already installed compatible UI screen; install that UI through its repository installer first when upgrading an older UI.

For recovery, reinstall the previous Toolkit desktop installer or use a separate clean checkout of the previous CLI release with the saved configuration. This does not roll back TV apps. Android may reject an app downgrade; do not uninstall an app to bypass that restriction if its data must be retained.

## Verification and limits

Host regressions cover integrity failures, private handoff acknowledgement, target selection, user cancellation and version readback. The macOS native desktop screen was checked against actual public release metadata. The public app update flow replaced Pipeworks Dream 1.0.0 with the published 1.1.0 on a physical Fire TV, verified its installed APK hash and preserved its seven existing preferences. All eleven settings then matched the original TV. Fire TV UI on the new TV also downloaded and installed the public Fire IPTV 1.1.1 update through Android's normal installer, verified the installed version and retained its channel catalog. Both TVs retained the disabled PiP preference after relaunch. Protected timer writes also passed actual native acknowledgement and OS readback.

Private UI staging reached the normal Android package update confirmation on the native emulator; cancellation retained the installed version. A later TV installer confirmation and installed version readback are required to claim a private UI replacement. Opening a desktop installer also requires the normal OS installation and a subsequent app-version check.

Public checks can encounter GitHub rate limits. Authenticated computer checks use existing GitHub credentials without sending them to a television. Apps outside the reviewed catalog are not represented as verified publishers. Unpublished screensaver candidates are excluded.

[Compare v4.3.2 with v4.4.0](https://github.com/jeremykenedy/fire-tv-toolkit/compare/v4.3.2...v4.4.0)
