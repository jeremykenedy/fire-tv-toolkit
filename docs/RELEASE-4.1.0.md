# Fire TV Toolkit 4.1.0

## Overview

Watch worldwide online IPTV from a desktop app, and manage Fire TV from the same window. The existing terminal commands remain available. Version 4.1.0 adds compatible features to 4.0.0.

## Major changes

The Electron desktop app browses the full iptv-org catalog with channel search, country, language and category filters, favorites, alternate sources and built-in HLS playback. Catalog downloads refresh every twelve hours, with a saved catalog available during an outage. Streams come directly from their online sources.

The app also connects to Fire TV over ADB to manage screensavers, home screens, OwnTV, Alexa wake, timers and protection. Guided device changes require native confirmation. A setting restored by another app before the final readback is reported as a conflict, with the actual TV state shown.

Setup assistant guides users through apps, settings and review, then applies the approved selections in order. Guided updater refreshes selected installed TV apps and revisits optional device settings. A failed step stops the remaining work and reports partial completion.

Advanced settings are off by default. An explicit warning must be accepted to reveal Activity and the TV terminal. The terminal runs bounded commands on the connected TV, with streamed output, exit status and a Stop control. About includes intended use, supported and unverified devices, liability information, repository and MIT license links, and the author credit. Navigation now includes icons.

Desktop downloads include Electron and verified Google Platform Tools 37.0.1. Users do not need Node.js or a separate ADB installation.

| System | Packages |
| --- | --- |
| macOS Intel and Apple silicon | DMG and ZIP |
| Windows x64 | EXE installer with an uninstaller |
| Linux x64 | AppImage and Debian package |

## Minor changes and fixes

The terminal OwnTV setup now offers the worldwide iptv-org playlist. README banners move at a moderate pace, with mobile layouts, light and dark themes, reduced-motion stills and content hashes. The README includes screenshots of the packaged desktop app and links to the desktop guide.

## Breaking changes

None. The terminal package still supports Node.js 18 and newer. Existing commands, saved settings and installed TV apps remain available. The default playlist shown by `firetv-iptv` expands from United States channels to the worldwide catalog; existing OwnTV playlists are preserved.

## Upgrade guide

For 4.0.0 users, download the desktop installer for your computer from this release. Install it using the operating system's normal application installation flow. Follow the [desktop guide](https://github.com/jeremykenedy/fire-tv-toolkit/blob/v4.1.0/docs/DESKTOP.md) for installation, playback, Fire TV setup and removal.

For a terminal checkout:

```sh
git pull --ff-only
npm ci
```

No terminal commands were added or removed, so existing command links continue to work. Your checkout's `.env` remains in place. Desktop device settings are stored separately in the operating system's application data directory, with a separate baseline for each TV.

Users upgrading from 3.x must first follow the [4.0.0 upgrade guide](https://github.com/jeremykenedy/fire-tv-toolkit/releases/tag/v4.0.0), which covers the removed private Fire TV UI integration. That removal is unchanged in this release.

To roll back the desktop app, remove it using the steps in the desktop guide. Removing it keeps TV apps, TV settings and saved device baselines in place. Restore timers, undo optimizations or select Amazon Home before removal if you want to undo those TV changes. To roll back the terminal checkout, check out `v4.0.0` and run `npm ci`.

## Verification

409 toolkit tests and 35 desktop tests pass. ESLint and dependency audits pass. Packaged application tests run on native macOS, Windows and Linux CI runners, exercising channel browsing, filters, favorite persistence, actual HLS video decoding, About, advanced preferences and the bundled ADB executable. Windows and Linux installer removal is checked on their native runners.

The packaged macOS app was also checked against the live worldwide catalog and a physical Insignia Fire TV Edition running Android 11. Device confirmation cancellation preserves the TV setting. Guided setup and an OwnTV update completed with verified results. Read-only shell commands returned the TV model, shell identity and exit status. Disabling Advanced settings hid both advanced tools. The final-state check detects another app restoring a different timer value instead of reporting success. macOS removal moved the app to Trash and preserved saved settings byte for byte.

## Known limitations

The desktop installers are unsigned. Apple notarization and trusted Windows publisher signatures require signing credentials that are not configured for this repository. Stream availability, regional restrictions and codec support depend on the source. The iptv-org catalog provides live channels; this release does not add a matched program guide or an on-demand catalog.

A separately installed app can protect its own Fire TV settings. Review that app's protection settings if it restores a timer, screensaver or home setting after a desktop change. The toolkit does not disable another app's protection automatically.

**Full changelog:** [v4.0.0 to v4.1.0](https://github.com/jeremykenedy/fire-tv-toolkit/compare/v4.0.0...v4.1.0)
