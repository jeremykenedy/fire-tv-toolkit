# Fire TV Toolkit 4.6.0

Save named TVs in the desktop app, switch targets explicitly and use Fire TV UI
as the recommended custom Home screen. The reviewed screensaver catalog adds
Nibbles HD and Lumen Breaker with real native previews and exact published APK contracts.

## Upgrade guide

Desktop users on 4.5.2 or earlier can install the matching 4.6.0 package. Existing
application data, Live TV favorites, settings and captured device baselines are
retained. The previous saved address migrates once to a named Fire TV profile;
its original file remains intact. Add, edit, rename or remove saved addresses in
Manage TVs. Selecting a different TV clears the current connection. Choose
Connect to read that TV before applying an action. The header and confirmation
identify the target. Removing a saved profile does not alter the TV or erase its
captured restoration history.

An existing clean primary-branch CLI checkout can update with:

```sh
firetv-updates --self --install toolkit --yes
```

A source installation can instead fast-forward verified `main`, run `npm ci`
and refresh `npm link`. Desktop-source Node 22.13+ and CLI Node 18+ minimums are
unchanged. Desktop named profiles are separate from the CLI's saved `.env` target.
Explicit CLI `--ip` arguments do not replace that saved default.

Update an older installed Fire TV UI to 1.11.1/code 70 before changing Home through
Toolkit. The regular checked-update flow remains available. A fresh Toolkit UI
install leaves Home selection unchanged until you choose Use or confirm the
reviewed guided setup. AT4K and LTvLauncher retain their existing commands and
legacy Home Redirect dependency; Fire TV UI uses its own two services.

## Breaking changes and compatibility

No configuration reset or Android app identity change is required. Fire TV UI
code 68 and unknown versions cannot safely preserve private Home choices during
computer routing transactions. Home changes are refused and desktop controls
are disabled until that UI is updated to at least code 69. This includes changing
away from an old UI. Updates remain available, and ordinary TV management is
unaffected. CLI `--install` still installs AT4K; the new UI flag is `--install-ui`.

## Major changes

- Save named TVs with add, edit, rename, remove and active-target selection.
  Duplicate addresses and invalid profiles are rejected without replacing the
  saved list. Switching or editing a target clears stale actions and checked
  update results until a new connection succeeds.
- Recommend Fire TV UI in desktop and guided CLI Home choices. Its installation
  does not install the legacy redirect. Guided setup recommends it for a fresh
  Amazon Home setup and reviews all selected actions before applying them.
- Add Nibbles HD 1.0.0 and Lumen Breaker 1.0.0 as reviewed screensavers, retaining all prior entries,
  Aerial Views as the default and the existing latest-published update flow.

## Minor changes and fixes

- Use the protected code 69 preference-only API before changing the OS route.
  Commit ordinary Home choices only after verified route readback. Failure
  restores the original enabled preference, including an absent key, and raw
  OS accessibility values. Full native Home failures restore the other three
  saved choices through the verified UI contract.
- Existing UI replacement does not issue Home operations or regrant setup
  permissions. A disabled UI stays disabled until explicit Use, so old saved
  service names cannot silently reactivate Home. Fresh installation grants its
  declared setup permission.
- Deliver the matching release's shared HD icons with UI installation and
  staged updates. Verify its archive and safe full HD catalog before TV writes,
  then copy, scan and publish the images for Android's picker without changing
  Home preferences or deleting unrelated pictures.
- Keep hardware-specific restoration history independent of a profile rename
  or address change. Corrupt profile files remain available for recovery rather
  than being silently overwritten.

## Security and privacy

Saved TV names and addresses stay in the desktop data directory, with validated
versioned local storage and atomic replacement. Profile selection does not
contact a TV. No tracking, telemetry, account, new service or TV permission is
introduced. The compatible Electron 44.9.3 and fast-uri 3.1.9 security fixes from
4.5.2 remain in place.

Fire TV UI is pinned to public 1.11.1/code 70, 9,053,902 bytes and SHA-256
`14676d28103f059178de13f4f4a3f8fbce63a4c98317a3635d31f064c63e5d43`.
Nibbles HD is pinned to public 1.0.0/code 3, 41,727 bytes and SHA-256
`c49bc22e5cbf5067da4bbcb1cd63140d31b0a49a83f6826e111986ee4b7d7971`.
Lumen Breaker is pinned to public 1.0.0/code 3, 74,551 bytes and SHA-256
`fc0513f85fc8563cd8463546108bbf5ea9c459ab72465c669b126fcc6c14269c`.
The paired UI icon archive is 8,505,979 bytes with SHA-256
`9c2655584b5c85c8574c1ccb6ace20e6470bd48d6c91c7c4ac0322dcb550ccea`.
All three public APKs and the icon archive were anonymously downloaded and their applicable package, certificate,
SDK metadata, byte count and published checksum verified before registration.

## Verification and limits

Local checks cover profiles, stale-target prevention, duplicate/invalid input,
Home compatibility, explicit routing and rollback, real download integrity and
catalog preservation. The exact signed UI 69 passed native update, mixed/missing
Home preferences, permission-denied rollback, Preview and offline credits on the
TV emulator, with its complete baseline restored. Nibbles retains its separately
verified native and physical Dream evidence; host registration does not imply a
new renderer or performance result. Code 70 retains that runtime and passed its
separate native catalog, thumbnail, Preview, settings and offline-credit gate.
The production icon helper copied and published all 32 initially missing HD PNGs
on the API 34 emulator, preserving existing files and the stopped UI state. No
private preference export or image picker was opened during this file-only check.

Final three-platform installed-package checks, current native desktop captures,
exact-primary CI and anonymous installer checksum verification are release gates.
The packages remain unsigned. macOS builds both architectures and tests the
runner's native packaged app; Windows and Linux test installation, playback,
favorites, profiles and removal. These checks use isolated sample TV data and
synthetic media, and do not establish a new physical TV Home or hardware-remote
result. Seven built installers do not mean seven separate hardware installations.

## Rollback and recovery

Keep the desktop data directory and retry the matching installer if installation
fails. Profile files use schema version 1. An older desktop does not understand
the new profile list, while the original previous-address file remains available.
Use a newer verified corrective release for regressions rather than clearing
app data or TV restoration baselines. No TV reboot or reset is required.

[Desktop guide](https://github.com/jeremykenedy/fire-tv-toolkit/blob/v4.6.0/docs/DESKTOP.md),
[Home guide](https://github.com/jeremykenedy/fire-tv-toolkit/blob/v4.6.0/docs/LAUNCHER.md),
[compare v4.5.2 to v4.6.0](https://github.com/jeremykenedy/fire-tv-toolkit/compare/v4.5.2...v4.6.0).
