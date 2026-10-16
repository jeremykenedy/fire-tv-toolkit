# Fire TV Toolkit 4.2.0

## Overview

Install fire-iptv from the desktop app or terminal and open a prepared live TV
catalog, matched guides and sports browsing on the TV. Version 4.2.0 adds
compatible features to 4.1.0. OwnTV remains available as an alternative.

## Major changes

**fire-iptv installation** is available at the top of Home & live TV, in the
setup and update assistants, and through `fire-iptv --install`. The toolkit
verifies the pinned v1.0.0 APK before installation, preserves existing app data
and opens Discover. Fresh app setup needs no manual starter-playlist import.

The [fire-iptv app](https://github.com/jeremykenedy/fire-iptv/releases/tag/v1.0.0)
is a GPL-3.0 fork of OpenIPTV. Its October 16, 2026 starter snapshot contains
1,323 public live-channel links, including 226 sports channels, and two XMLTV
feeds with approximately 299 matched channel IDs. Availability varies by
source and region. It includes no on-demand catalog; the owner adds a provider
for movie and series posters, genres, recommendations and recent releases.
Tubi and Plex shortcuts open those separate applications.

**OwnTV setup** now offers the guide-matched playlist and both guide URLs in
the CLI and desktop UI. The player is unchanged. Set the playlist as the
default, choose a six-hour refresh and sync both EPG sources inside OwnTV.
See [IPTV setup](https://github.com/jeremykenedy/fire-tv-toolkit/blob/v4.2.0/docs/IPTV.md).

## Minor changes and fixes

- The shared IPTV menu recommends fire-iptv and retains OwnTV.
- `firetv-revert --all` preserves both players and their private libraries.
  Each can be selected separately for removal.
- Native desktop screenshots cover the updated installer and setup/update
  assistants. A published-release install was checked through both the
  desktop updater and the CLI.
- Tests cover checksum rejection, selecting the intended player and retaining
  the other installed player.

## Breaking changes

None. CLI Node.js support remains 18 and newer. Desktop development still
requires Node.js 22.13 or newer; desktop users need no separate Node or ADB
installation. Existing toolkit settings and installed TV libraries remain.

Legacy `firetv-iptv --install` and `firetv-iptv --uninstall` without `--app`
still target OwnTV. The interactive menu now recommends fire-iptv. OwnTV's
new preset changes the instructions shown for new imports; existing playlists
are not rewritten by the toolkit.

## Upgrade guide

From 4.1.x, install the new desktop package for your operating system, or update
a CLI checkout:

```bash
git pull --ff-only
node setup.js
fire-iptv --install
```

`node setup.js` links the new command. Desktop users choose Install fire-iptv
under Home & live TV. The TV app is separate from OpenIPTV and OwnTV; it does
not automatically migrate their private databases. No settings, timer or
library migration is required. Enter provider credentials locally inside the
player to add on-demand movies and series.

From 4.0.x or older, also read the
[4.1.0 desktop upgrade guide](https://github.com/jeremykenedy/fire-tv-toolkit/blob/v4.1.0/docs/RELEASE-4.1.0.md)
and the earlier breaking changes in the
[changelog](https://github.com/jeremykenedy/fire-tv-toolkit/blob/v4.2.0/CHANGELOG.md).

To roll back the desktop app, reinstall 4.1.0. For a CLI checkout, return to
`v4.1.0` and run `node setup.js` to relink that version's commands. A toolkit
rollback leaves installed TV apps in place. Removing a TV player deletes its
private library, so export a backup inside the player first if needed.

## Verification and limits

| Check | Result |
| --- | --- |
| CLI suite | 414 tests passed on Node 18 and 20 |
| Desktop lint and unit tests | Passed; 37 tests |
| Packaged desktop builds | macOS Intel/ARM, Windows x64 and Linux x64 passed CI |
| Packaged playback and persistence | HLS fixture playback and favorites persisted in the installed-app checks |
| Native macOS device workflow | Installer, setup/update review, guide instructions and read-only TV shell checked against a physical Fire TV |
| Public fire-iptv download | Desktop updater and CLI installed the checksum-verified release successfully |
| TV application | First launch, guide, sports, search, provider setup, Tubi/Plex launch, live playback and in-place data preservation checked on ARM32 Fire TV |

The release APK also includes ARM64, which was compiled but not tested on
physical ARM64 hardware. Public stream uptime and regional access vary. Modern
on-demand movies and series require a provider that supplies them. The desktop
packages remain unsigned; signing and notarization are documented in the
[signing guide](https://github.com/jeremykenedy/fire-tv-toolkit/blob/v4.2.0/docs/SIGNING.md).

[Compare v4.1.0 with v4.2.0](https://github.com/jeremykenedy/fire-tv-toolkit/compare/v4.1.0...v4.2.0).
