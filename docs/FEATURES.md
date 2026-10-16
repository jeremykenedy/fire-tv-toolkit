# Features

Choose the [desktop app](DESKTOP.md) for graphical controls and IPTV playback, or the [CLI](COMMANDS.md) for guided terminal menus and scripts. Both manage the same supported Fire TV apps and settings.

## Live TV and guides

The desktop app browses the worldwide iptv-org catalog. Search channels, filter by country, language or category, save favorites, and choose alternate stream sources. Desktop playback works without a TV connection.

For playback on your TV, install fire-iptv for automatic live-channel and guide setup. It includes sports browsing and supports your own provider's movie and series library. OwnTV remains an alternative. Stream availability depends on the source and region. See [TV guide and IPTV](IPTV.md).

## Screensavers

Install individual screensavers from verified GitHub releases, then choose the active one from your computer or the on-TV picker. Aerial Views is the default when available. Android Colors and Amazon's screensaver remain selectable. See the [screensaver catalog](SCREENSAVERS.md) for every app and install ID.

The optimizer checks screensaver enablement, idle timing, Ambient Experience and Aerial Views permissions, then changes only supported settings. See [Optimizing](OPTIMIZE.md).

## Home screens

Choose AT4K or LTvLauncher as an optional home screen. Home Redirect opens the selected launcher when Amazon Home appears and provides the on-TV screensaver picker. The launcher command also restores Amazon Home. See [Home screen](LAUNCHER.md).

## Alexa and idle timers

The Alexa fix enables Fire OS's setting for reaching the TV during deep sleep. Sleep and screensaver delays can be reviewed, changed or reset to their captured baselines. See [How it works](HOW-IT-WORKS.md) and [Timeouts](TIMEOUTS.md).

## Setup protection

Guard saves selected screensaver, Alexa, Home and timeout settings and restores them when Fire OS changes them. Update restrictions depend on what the TV permits. Individual settings can be unlocked and protection can be disabled. See [Guard](GUARD.md) for its checks and limits.

## Guided setup and updates

The desktop setup assistant reviews app choices and settings before applying them. The updater refreshes selected installed TV apps from verified releases. Downloads are checked against published or pinned SHA-256 values before installation. See [Desktop app](DESKTOP.md#guided-setup-and-updates).

CLI commands explain guided changes, accept flags and return a nonzero exit status on failure. Use `--help` for a command's options. See [Commands](COMMANDS.md).

## Diagnostics and advanced tools

`firetv-diagnostics` reads device, display, memory, storage, installed screensaver versions and selected app summaries. It is also available from Advanced diagnostics in the CLI menu. Unsupported reads are identified; Android UI frame counters do not measure GPU or video playback FPS.

The desktop app's Advanced settings reveal Activity and the TV terminal after a warning is accepted. Shell commands run on the connected TV and can make lasting changes. See [Advanced settings](DESKTOP.md#advanced-settings).

## Restore and remove

Restore captured settings item by item with the revert flow. Removing a TV app deletes its private data. Removing the desktop app leaves TV apps and settings in place. See [Uninstalling](UNINSTALLING.md).
