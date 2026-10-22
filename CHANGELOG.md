# Changelog

## [4.3.2] - 2026-10-22

### Fixed in 4.3.2

- Refresh Twilight Hearth descriptions and physical Fire TV preview for its recorded-fire release.
- Show registry explanations in desktop screensaver rows instead of blank descriptions.
- Align the desktop local Toolkit dependency metadata with the current version, Apache license and commands.

### Upgrade

Install the latest desktop package, or update the CLI checkout and run `node setup.js`. Existing TV settings and app preferences remain unchanged. See the [4.3.2 upgrade guide](docs/RELEASE-4.3.2.md).

## [4.3.1] - 2026-10-16

### Changed in 4.3.1

- The README introduces Desktop App and CLI App first, with direct desktop downloads and a short feature table. Detailed features, setup, integrations and screenshots now live in indexed guides.
- The toolkit is licensed under Apache 2.0. Package metadata, the desktop About screen and bundled license files agree; third party licenses remain separate.
- Desktop installer filenames stay stable across releases so README download links continue to work.

### Upgrade

Install the latest desktop package, or pull the CLI checkout and run `node setup.js`. Existing TV settings and app data are preserved. See the [4.3.1 upgrade guide](docs/RELEASE-4.3.1.md), including the license change for redistributors.

## [4.3.0] - 2026-10-16

### Added in 4.3.0

- Slot Vision is an optional screensaver with a dimensional slot-machine cabinet, classic and multi-row games, seasonal symbols, rotating reels and slow camera movement.
- Hearth Presence is an optional fireplace screensaver with adjustable surrounds, frame width, frameless presentation and burn speed, including a wide rectangular modern gas layout.

### Changed in 4.3.0

- Screensaver documentation records a visual quality gate: review moving native output, source detail, frame pacing and lifecycle before publishing.
- Advanced diagnostics reports device and screensaver state locally without changing TV settings.

### Upgrade

Run `git pull` on the Toolkit checkout. Existing commands and saved settings remain supported. Use `firetv-screensavers --install=<id> --yes` to install or update an individual saver. Installation keeps the active screensaver; use `screensaver --set=<id>` when you want to select it.

## [4.2.0] - 2026-10-16

### Major changes

- `fire-iptv --install` installs the signed fire-iptv v1.0.0 APK, verifies its SHA-256, preserves app data and opens Discover. Its starter prepares live TV and matched guide feeds automatically; movie and series libraries come from a provider added in the app.
- The shared IPTV menu recommends fire-iptv and retains OwnTV. The desktop Home screen and setup/update assistants also support fire-iptv.
- OwnTV setup instructions use the guide-matched live/sports preset and two XMLTV feeds.

### Minor changes and fixes

- Revert offers both players individually and preserves both with `--all`.
- Installer tests cover checksum rejection, player selection and preservation of the other installed player.

### Upgrade guide

From 4.1.x or 4.0.x, pull the toolkit checkout and run `node setup.js` to link the new `fire-iptv` command. Desktop users install the new desktop package. Node 18 remains the CLI minimum; the desktop development toolchain requires Node 22.13 or newer.

Run `fire-iptv --install` to install or update the TV app. It is separate from OpenIPTV and OwnTV. No TV library or configuration migration is required. Add a provider inside the TV app to populate modern on-demand movies and series. Removing a player deletes its private library; back up inside it first.

### Breaking changes

None. Legacy `firetv-iptv --install` and `--uninstall` without `--app` still target OwnTV. Existing toolkit device settings, timers and installed player data are preserved. The recommended interactive player is now fire-iptv.

## [4.1.0] - 2026-10-16

### Added in 4.1.0

- A desktop app for worldwide online IPTV, with search, country, language and category filters, favorites, alternate sources and HLS playback.
- Native confirmation for Fire TV controls, bundled verified ADB, per-device timer baselines, and installers for macOS, Windows and Linux.
- Guided setup and app updates with reviewed selections, ordered installation and verification, and clear partial completion when a step fails.
- Advanced settings with an enable warning, hidden Activity and TV terminal controls, streamed TV command output, exit status and cancellation.
- Navigation icons and an About page with compatibility, intended use, liability information, repository and license links, and author credit.
- Packaged application checks on all three operating systems, including HLS decoding, saved favorites and Windows/Linux installer removal.

### Changed in 4.1.0

- OwnTV setup now offers the worldwide iptv-org playlist.
- README banners animate at a moderate pace and include mobile layouts and reduced-motion stills.
- Final device state is checked before reporting completion, including changes reverted by another app.

### Upgrade

See the [4.1.0 upgrade guide](docs/RELEASE-4.1.0.md). Desktop packages are currently unsigned.

## [4.0.0] - 2026-10-15

### Removed in 4.0.0

- The `firetv-ui` command and `launcher --use=fire-tv-ui`, with their menu entry, revert option and guide. Fire TV UI was a private launcher build, and it leaves the toolkit until it is rebuilt. The toolkit no longer routes screensaver and timer changes through it, and `guard` no longer switches its protection on or off. An installed copy on a TV is left as it is.

### Changed in 4.0.0

- Aerial Views installs from its author's own release, [theothernt/AerialViews](https://github.com/theothernt/AerialViews) 1.8.5, pinned by tag and SHA-256, instead of a mirror in a fork. It is signed with the same key as before, so an installed copy updates in place and keeps its settings.
- The package lockfile lists the current version and commands.

### Upgrade

Run `git pull` on the Toolkit checkout, then `node setup.js` so the `firetv-ui` link is removed. Run `firetv-screensavers --install=aerial --yes` to update Aerial Views to 1.8.5.

## [3.11.1] - 2026-10-15

### Fixed in 3.11.1

- `firetv-ltv-backup` copies the backup into a private temporary folder and checks it there, then writes it to the file you named only if that file still does not exist. Before, the copy went straight to the destination and a file created there between the check and the copy could be overwritten. Saved backups are readable only by you.
- LTvLauncher backups are listed newest first with a locale-aware comparison. The order is unchanged.

### Upgrade

Run `git pull` on the Toolkit checkout. No commands were added, so `node setup.js` is not needed.

## [3.11.0] - 2026-10-15

### Added in 3.11.0

- `firetv-iptv` installs OwnTV, a free, open source IPTV player, opens it on the TV, and shows the iptv-org playlist of publicly available United States channels with the steps to add it from a phone or browser. OwnTV is installed unmodified from its own release, pinned by tag and SHA-256. `--uninstall` removes it.
- `firetv-revert` and `uninstall` offer to remove OwnTV. It starts unticked, because removing it deletes the playlists saved in it, and `firetv-revert --all` leaves it installed.
- `firetv-ltv-notifications` lets LTvLauncher read notifications, which Android TV only grants over adb. `launcher --install-ltv` turns it on after installing, the launcher menu offers it while it is off, and `firetv-revert` turns it off.
- `firetv-ltv-backup` copies a backup exported in LTvLauncher from the TV's Download folder to this computer, checking it is an LTvLauncher backup and never overwriting a file. Restoring stays in LTvLauncher's own Import Backup, which only lists backups it exported itself.
- The guided menu has an entry for every standalone command: OwnTV, LTvLauncher notifications and backups, optimize, guard, revert, and List all commands.

### Changed in 3.11.0

- `info`, `information`, `guide` and `firetv` list the commands in a bordered table with Command and What it does columns, grouped by area and fitted to the terminal.
- The main menu and command list screenshots show the new entries and the table.
- The test helpers write their output with `process.stdout.write`, so no logging calls are left in the code.

### Upgrade

Run `git pull` on the Toolkit checkout, then `node setup.js` to link the new commands. Run `firetv-iptv --install` to add OwnTV.

## [3.9.1] - 2026-10-09

### Fixed in 3.9.1

- Home Redirect 1.2.6 describes itself as opening AT4K or LTvLauncher in the TV's accessibility settings, instead of AT4K only.
- The uninstall guide, the device report form and the package keywords cover LTvLauncher, and the main menu and launcher screenshots show its options.

## [3.9.0] - 2026-10-09

### Added in 3.9.0

- LTvLauncher as a second optional home screen beside AT4K. `launcher --install-ltv` installs it with Home Redirect, `launcher --use=ltv` sends the Home button to it, and the guided menu, `firetv-revert` and `uninstall` cover it the same way as AT4K. It is installed unmodified from its own release, pinned by tag and SHA-256, and has no internet permission.
- Home Redirect 1.2.5 opens either AT4K or LTvLauncher, chosen with its new `home` command. It still opens AT4K unless told otherwise.

### Changed in 3.9.0

- `firetv-revert` and `uninstall` no longer remove AT4K or LTvLauncher unless you tick them. Removing a launcher deletes its home screen layout, so they start unticked and `firetv-revert --all` leaves them installed.

### Upgrade

Run `git pull` on the Toolkit checkout, then `node setup.js` to refresh command links. To try LTvLauncher, run `launcher --install-ltv --use=ltv`; `launcher --use=at4k` switches back.

## [3.8.0] - 2026-10-09

### Added in 3.8.0

- Add Helios Lightfield to the guided screensaver installer and selector, with its verified release checksum and README preview. It installs Helios Lightfield 1.0.1, which runs at about 55 frames per second on a 1080p Fire TV instead of about 8.

### Fixed in 3.8.0

- The command reference now lists every screensaver id for `screensaver --set`, including Cloud Drift Clock, Perseid Passage, Split-Flap Drift, Canopy Drift, Contour Flow, Skyburst Nocturne and Pulse Circuit, which were missing.

### Upgrade

Run `git pull` on the Toolkit checkout, then `node setup.js` to refresh command links. Install with `firetv-screensavers --install=helios-lightfield --yes` and activate it with `screensaver --set=helios-lightfield`.

## [3.7.0] - 2026-10-09

### Added in 3.7.0

- Add Skyburst Nocturne and Pulse Circuit to the guided screensaver installer and selector, with verified release checksums and reviewed README previews.

### Upgrade

Run `git pull` on the Toolkit checkout, then `node setup.js` to refresh command links. Install either saver with `firetv-screensavers --install=<id> --yes` and activate it with `screensaver --set=<id>`.

## [3.6.1] - 2026-10-09

### Fixed in 3.6.1

- ADB debugging stays on. Home Redirect 1.2.4 turns it back on if it is switched off, and checks at every restart. It never turns on wireless debugging, which the toolkit does not need and which makes Fire OS ask to allow debugging on the network after every restart. See [Guard](docs/GUARD.md#keeping-adb-debugging-on).

## [3.3.0] - 2026-10-08

### Added in 3.3.0

- Jellyfish Drift, Firefly Grove, Neon Corridor, Starfield Drift and Rain on Glass screensavers, as optional installs in `firetv-screensavers`, with screenshots in the README.
- `firetv-ui`: guided installation, update, removal, and backup transfer for Fire TV UI. Choose the saved simple layout, keep current settings, restore the TV backup, or import a file, then review Home, screensaver, protection, and backup choices before execution.
- Fire TV UI in the main menu, launcher selection, and full revert options.
- Persistent TV Downloads backups with validated computer import/export and private computer files. Uninstall keeps the TV backup unless deletion is explicitly selected.
- Add Twilight Hearth, Nebula Drift, Vortex Spiral, Signal Rain, Retro Flight, and Pipeworks Dream to the guided screensaver installer and selector.
- Add Aqua Surface Drift to the guided installer and selector, with a verified screenshot in the README gallery.
- Add Earthbound Orbit to the guided installer and selector, with its verified release checksum and README preview.

### Fixed in 3.3.0

- Home routing is rebound after Fire TV UI updates. Opening the launcher no longer force-stops its accessibility services.
- Intentional CLI timer and screensaver changes update Fire TV UI's desired settings so its protection service does not revert them.
- Home Redirect 1.2.2 delegates shared settings to Fire TV UI and retires stale snapshots, preserving the GUI's Home and timer choices. Guard enable, disable, and screensaver unlock commands also control the native protector.
- Home Redirect 1.2.3 sends on-TV screensaver choices through Fire TV UI's protected settings receiver and confirms the active choice before reporting success.
- Fire TV UI 1.0.1 fixes screensaver selection so the picker's choice survives its local protection service.

### Changed in 3.3.0

- Scrutinizer integration and badges removed.
- Existing commands, AT4K installation, saved IP, and first-observed timeout baselines remain supported. Upgrade with `git pull`, then `node setup.js` to link the new command. Fire TV UI is optional; run `firetv-ui` to install it.

## [3.2.2] - 2026-10-08

### Added in 3.2.2

- Seven new screensavers as optional installs in `firetv-screensavers`: Jellyfish Drift, Firefly Grove, Neon Corridor, Starfield Drift, Rain on Glass, Rainforest Cascade and Blue Meridian, with screenshots in the README.
- A [project site](https://jeremykenedy.github.io/fire-tv-toolkit/), built from the README and docs and deployed on every push to `main`.

### Changed in 3.2.2

- Images optimized.

## [3.2.1] - 2026-10-08

### Added in 3.2.1

- `guard --unlock=screensaver` stops guarding which screensaver is active, so it can be changed from anywhere, and `guard --lock=screensaver` guards it again (Home Redirect 1.2.1).

## [3.2.0] - 2026-10-08

### Added in 3.2.0

- `guard` / `firetv-guard`: Home Redirect 1.2.0 saves the screensaver, Alexa fix, Home and timeout settings and puts them back when Amazon changes them (straight away, at boot, after an app update, and every 15 minutes). Amazon's `easyupgrade` and `forcedotaupdater` are disabled and its main updater is stopped from running in the background. `--check` puts back anything that slipped through, `--off` undoes it all. Offered during `start` and `update`, and turned off first by `firetv-revert`.

### Changed in 3.2.0

- Scrutinizer removed.

## [3.1.0] - 2026-10-08

### Added in 3.1.0

- `optimize` / `firetv-optimize`: checks the TV for settings that stop or spoil a screensaver and fixes only the ones it has. Offered during `start` and `update`, and undone by `firetv-revert`.
- Android's built-in Colors screensaver can be made active with `screensaver --set=colors`.

### Changed in 3.1.0

- Aerial Views is the default: it starts checked on a TV with no screensavers yet, and `screensaver --yes` picks it whenever it is installed.
- Amazon's screensaver is listed as "Amazon with Ads", in the commands and in the on-TV picker (Home Redirect 1.1.1).
- The Aerial Views screenshot shows the screensaver playing instead of its menu.

### Fixed in 3.1.0

- A screensaver written in its long form (`package/package.Class`) is now recognized as the same screensaver.

## [3.0.0] - 2026-10-08

Renamed from amazon-fire-tv-fixes to Fire TV Toolkit, since it now does much
more than fixes.

### Added in 3.0.0

- Aquarium Live and Aquarium 4K screensavers.
- `launcher` / `firetv-launcher`: installs the optional AT4K home screen and switches the Home button between it and the Amazon menu.
- Home Redirect app (`android/home-redirect`) with an on-TV Screensavers picker, since Fire OS Settings only lists Amazon's screensaver.
- `screensaver`: a short name for `firetv-set-screensaver`.
- Screenshots of every screen, and a docs folder with a guide for each part.
- Issue forms for bugs, feature requests, screensaver requests and device reports.

### Changed in 3.0.0

- Commands renamed: `amazon-fire-tv-fixes` is now `fire-tv-toolkit`, and `amazon-fire-tv-fixes-uninstall` is now `firetv-revert`.
- Screensaver checksums can now come from a `.sha256` file attached to the release, as well as from the release notes.
- `firetv-revert` and `uninstall` also send the Home button back and can remove the launcher apps.
- The title banner shrinks to fit narrow terminals.

### Fixed in 3.0.0

- Updating Home Redirect no longer leaves the Home button on the Amazon menu.
- SonarCloud reliability findings: unawaited promises, misplaced doc comments and exported mutable bindings.
- Environment variables can no longer redirect where `.env` is written or which folder is deleted.

## [2.0.0] - 2026-09-29

### Added in 2.0.0

- Timeout commands: view, change and reset the sleep and screensaver timeouts, with first-observed baselines.
- `start`, `update`, `info`, `uninstall`, `delete` and `remove`.
- `--help` on every command, Esc to cancel at any prompt, and non-zero exit codes on failure.

### Changed in 2.0.0

- Uninstall offers to put the TV back first, and reports when a revert did not take effect.
- Screensaver APKs are checked against a published SHA-256 before installing.

## [1.0.0] - 2026-09-28

### Added in 1.0.0

- The Alexa deep-sleep fix and ad-free screensavers, each with a guided installer and a standalone command.

[3.3.0]: https://github.com/jeremykenedy/fire-tv-toolkit/releases/tag/v3.3.0
[3.2.2]: https://github.com/jeremykenedy/fire-tv-toolkit/releases/tag/v3.2.2
[3.2.1]: https://github.com/jeremykenedy/fire-tv-toolkit/releases/tag/v3.2.1
[3.2.0]: https://github.com/jeremykenedy/fire-tv-toolkit/releases/tag/v3.2.0
[3.1.0]: https://github.com/jeremykenedy/fire-tv-toolkit/releases/tag/v3.1.0
[3.0.0]: https://github.com/jeremykenedy/fire-tv-toolkit/releases/tag/v3.0.0
[2.0.0]: https://github.com/jeremykenedy/fire-tv-toolkit/releases/tag/v2.0.0
[1.0.0]: https://github.com/jeremykenedy/fire-tv-toolkit/releases/tag/v1.0.0
