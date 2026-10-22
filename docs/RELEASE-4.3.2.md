# Fire TV Toolkit 4.3.2

Twilight Hearth's catalog description and gallery now match its verified 1.1.0 recorded-fire release. The existing installer entry already resolves the latest upstream release; this patch keeps that path and refreshes the actual physical TV preview.

## Upgrade guide

From 4.3.1 or 4.3.0, install the 4.3.2 desktop package for your operating system. CLI users update their checkout and relink commands:

```sh
git pull --ff-only
node setup.js
```

Update Twilight Hearth separately with:

```sh
firetv-screensavers --install=twilight-hearth --yes
```

Its existing package and signer preserve app preferences on an ordinary update. Selecting a screensaver remains a separate action; installation does not change that selection or timers. There are no database, environment, playlist or cache migrations. Node.js 18 remains the CLI minimum; desktop source builds require 22.13 or newer, and installers bundle the runtime and ADB.

From 4.2.x and 4.1.x, also read the [4.3.0 guide](https://github.com/jeremykenedy/fire-tv-toolkit/blob/v4.3.2/docs/RELEASE-4.3.0.md). Earlier upgrade paths are in the [changelog](https://github.com/jeremykenedy/fire-tv-toolkit/blob/v4.3.2/CHANGELOG.md). Version 4.3.1 adopted Apache 2.0; its [redistribution guidance](https://github.com/jeremykenedy/fire-tv-toolkit/blob/v4.3.2/docs/RELEASE-4.3.1.md) still applies.

To roll back Toolkit, reinstall the previous desktop package or restore its CLI tag and run `node setup.js`. Toolkit rollback leaves TV apps and their private data in place. Uninstalling a TV app deletes that app's preferences and is not required for this update.

## Breaking changes

None. Existing commands, default screensaver, settings, supported runtime floors and APK checksum/trusted-host checks remain unchanged. Apache 2.0 and the bundled NOTICE from 4.3.1 are preserved.

## Major changes

None in this patch. Twilight Hearth 1.1.0 is a separate signed app release, available through its existing latest-release installer entry. Its recorded wood fire and photographed brick, stone and slate are described in the [upstream release](https://github.com/jeremykenedy/twilight-hearth/releases/tag/v1.1.0).

## Minor changes and fixes

- Replace the old painted-fire gallery thumbnail with actual modern/bright physical Fire TV output from the exact signed 1.1.0 APK.
- Describe flame exposure and actual playback speed accurately in CLI and desktop catalog metadata.
- Show screensaver explanations in the desktop catalog by reading the registry blurb field.
- Record source capture, APK hash and byte count alongside the preview.
- Align the desktop lockfile's local Toolkit package version/license/command metadata with the current source package, without changing external dependency versions.

## Verification and limits

The upstream APK was independently downloaded, checksum and signer verified, and tested on physical Fire TV AFTDEC012E/API30. The exact APK SHA-256 is `dd39810f8bf2a67af7f133554897741323d9a14d606b3fc1a441285646b440f5`, 27,207,363 bytes. Actual remote Preview/Back, bound DreamService/Back, settled moving playback and exact preference/system restoration passed. This does not establish automatic idle activation, native 4K or sustained thermal behavior.

Local validation passed 419 CLI tests, 37 desktop tests and desktop lint. The existing trusted latest-release download fetched the exact upstream APK and verified its published checksum. Public gallery and final primary-branch packaged checks must pass before publication. Desktop packages remain unsigned. Existing IPTV, diagnostics, setup and launcher behavior is preserved; this patch does not publish unfinished screensaver candidates.

[Compare v4.3.1 with v4.3.2](https://github.com/jeremykenedy/fire-tv-toolkit/compare/v4.3.1...v4.3.2).
