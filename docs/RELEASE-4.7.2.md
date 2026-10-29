# Fire TV Toolkit 4.7.2

Refresh the reviewed Fire TV UI companion while preserving Toolkit controls,
named TVs, configuration, Home choices and update verification.

## Upgrade guide

Desktop users on 4.7.1 can replace the app with the matching 4.7.2 installer.
Quit the previous app and retain its Application Support data for named TVs,
favorites and restoration history. Older 4.x installations follow the same
replacement path; the [4.7.0 upgrade guide](https://github.com/jeremykenedy/fire-tv-toolkit/blob/v4.7.0/docs/RELEASE-4.7.0.md)
covers earlier source-install details.

A clean primary-branch CLI checkout can use the established updater:

```sh
firetv-updates --self --install toolkit --yes
```

It fast-forwards clean `main`, runs `npm ci` and refreshes `npm link`, preserving
ignored `.env` configuration and custom screensaver sources. Dirty or non-primary
checkouts are refused. No TV reboot or configuration reset is required.

## Breaking changes

None. CLI Node 18+ and desktop-source Node 22.13+ remain the minimums.
App identities, signing expectations, host routes and saved profiles remain.
Installing Fire TV UI remains separate from choosing Use.

## Major changes

None for the Toolkit host. This patch refreshes the existing companion baseline.

## Minor changes and fixes

The reviewed baseline is public [Fire TV UI 1.15.0/code 76](https://github.com/jeremykenedy/fire-tv-ui/releases/tag/v1.15.0).
The companion offers optional horizontal app rows, built-in artwork treatments
and short settings transitions while retaining its existing defaults. These are
configured in the TV UI; host Home-selection controls remain unchanged.

The 17,089,176-byte APK matched SHA-256
`f8a7ac4dd7c40a08e408c517d89a703f0f602af0076a982ec10449c787d6ef29`.
Its paired 8,505,979-byte icon ZIP matched
`7358478cc1cfa8c020a0d32b40991d4de687b806e611e8a4aab35bb534842bbf`.
All 32 images remain Full HD. Android package, version, SDK metadata and the
existing production signer were verified. No new dependency is introduced.

All other app pins and Home-selection behavior remain unchanged. The release
guide now distinguishes a companion refresh from a change to legacy Home
Redirect, which does not need rebuilding for this patch.

## Security and verification

All four public APK/icon/checksum files were anonymously downloaded and matched
the frozen release identities. Actual Toolkit download and icon-preparation
helpers passed against the public release. No host permission, network behavior
or preference schema is added; reviewed hashes and update verification remain.

Local verification passed 501 CLI tests, 56 desktop tests, desktop lint and four
README checks. Current packaged macOS arm64 About/update captures show version
4.7.2 and record the exact embedded UI pin using isolated sample data. README and
gallery rendering passed in Chrome at 1280 and 390 pixels. Essential exact-head
CI covers Node 18/20 and the macOS, Windows and Linux desktop matrix, including
native package, install and removal checks. The final primary packages and public
installer checksums are verified before publication.

Desktop packages remain unsigned with the existing macOS Gatekeeper limitation.
Native behavior belongs to the companion's actual verification record; updating
a host pin does not establish new physical Home, Alexa or receiver acceptance.

## Rollback and recovery

Keep the previous verified installer and app-data directory. No profile migration
is required. Restore the host app without resetting TV baselines or uninstalling
companion apps. Prefer a newer verified corrective release if replacement fails.

[Compare 4.7.1 to 4.7.2](https://github.com/jeremykenedy/fire-tv-toolkit/compare/v4.7.1...v4.7.2).
