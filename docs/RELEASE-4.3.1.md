# Fire TV Toolkit 4.3.1

Desktop App and CLI App are now clearly separated at the start of the README. The desktop graphic downloads an installer directly, while a short feature table links to detailed guides. This patch also adopts Apache 2.0 and includes the license and notice files in desktop packages.

## Upgrade guide

From 4.3.0, install the 4.3.1 desktop package for your operating system, or update a CLI checkout:

```sh
git pull --ff-only
node setup.js
```

No TV configuration, playlist, app data or database migration is required. Existing device settings and timer baselines are kept. The CLI still requires Node.js 18 or later. Desktop installers bundle the runtime and ADB; desktop source builds require Node.js 22.13 or later.

From 4.2.x or 4.1.x, also read the [4.3.0 guide](https://github.com/jeremykenedy/fire-tv-toolkit/blob/v4.3.1/docs/RELEASE-4.3.0.md). For 4.0.x and older, review the earlier upgrade notes in the [changelog](https://github.com/jeremykenedy/fire-tv-toolkit/blob/v4.3.1/CHANGELOG.md).

To roll back, reinstall your earlier desktop package or return the CLI checkout to its previous tag and run `node setup.js`. A toolkit rollback leaves TV apps and their private data in place.

## Breaking changes

Commands, runtime requirements and saved settings are unchanged. The toolkit's license changes from MIT to Apache 2.0. Redistributors should review the [license](https://github.com/jeremykenedy/fire-tv-toolkit/blob/v4.3.1/LICENSE) and retain the supplied [NOTICE](https://github.com/jeremykenedy/fire-tv-toolkit/blob/v4.3.1/NOTICE). Third party dependencies and optional TV apps retain their own licenses.

Installer asset filenames omit the version. Scripts that construct a versioned filename should use the stable names listed on the [README](https://github.com/jeremykenedy/fire-tv-toolkit/blob/v4.3.1/README.md#desktop-app), or select assets from the release API. The release tag still identifies the exact version.

## Major changes

- The README presents Desktop App and CLI App first, followed by a clickable desktop screenshot and direct installers for macOS, Windows and Linux.
- A concise feature table replaces detailed feature prose. Setup, integrations, upstream sources and the full screenshot gallery are in indexed documentation.
- Apache 2.0 appears in package metadata and the native About screen. Desktop packages include LICENSE and NOTICE.

## Minor changes and fixes

The desktop setup guide link follows its new documentation location. Refreshed desktop screenshots show the current packaged app. Documentation checks still require every command, screensaver and screensaver preview to remain discoverable in the linked guides.

## Verification and limits

Local validation passed 419 CLI tests, desktop lint and 37 desktop tests. The packaged macOS app was checked against a physical Fire TV with read-only device operations, including the Apache About text and bundled license files. The README and gallery were inspected in a browser; the overview also passed a 320px layout check. The final primary-branch checks and installer verification must pass before publication.

Desktop installers remain unsigned. Fire TV Stick and Cube behavior is not yet verified. This release does not publish unfinished screensaver projects or change their TV data.

[Compare v4.3.0 with v4.3.1](https://github.com/jeremykenedy/fire-tv-toolkit/compare/v4.3.0...v4.3.1).
