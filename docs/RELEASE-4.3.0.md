# Fire TV Toolkit 4.3.0

Install Slot Vision and Hearth Presence from their verified signed releases, and inspect TV state with local diagnostics. Existing desktop IPTV and Fire TV setup features from 4.2.0 remain available.

## Upgrade guide

From 4.2.x, 4.1.x or 4.0.x, pull the Toolkit checkout and run `node setup.js` to link commands. Desktop users install the 4.3.0 package for their operating system. Node 18 remains the CLI minimum; desktop development requires Node 22.13 or newer. No device data migration is required.

```sh
firetv-screensavers --install=slot-vision --yes
firetv-screensavers --install=hearth-presence --yes
firetv-set-screensaver --set=slot-vision --yes
```

Installation updates the app in place while preserving preferences and the selected screensaver. Selection is an explicit separate command. Use each app's own settings for game, camera, frame and flame controls. The on-TV Fire TV UI catalog is maintained separately with matching signed artifact pins.

To remove an app, first select another screensaver, then run `firetv-screensavers --uninstall=ID --yes --force`. Uninstalling deletes that app's private preferences. To roll back the Toolkit, restore your previous checkout or desktop installer; app data changes are not part of this update.

## Breaking changes

None. Existing commands, supported configuration keys and saved TV settings remain supported. The previous release's IPTV players and desktop flows are preserved.

## Major changes

- Slot Vision offers classic BAR/7 and multiline seasonal games, cabinet and fullscreen reels, slow camera movement, proportional payout coins and a sustained jackpot shower.
- Hearth Presence offers moving fireplace scenes, surround materials, frame size and frameless presentation, plus a wide modern gas-style layout and supported fire controls.
- `firetv-diagnostics` and the Advanced menu report device, dream and settings information locally without changing TV configuration or uploading data.

Both screensaver APKs are downloaded from GitHub releases and verified against their published checksums before installation. The registry uses explicit APK asset names. Existing owner-repository entries continue to resolve the latest release when updated.

## Minor changes and fixes

The updated gallery thumbnails come from actual native output. Rainforest Cascade 1.1.0 now resolves through its existing latest-release registry entry and shows the original animated sunrise garden alongside three real waterfall videos. Hearth uses a physical AFTDEC012E modern linear fireplace capture; Slot Vision uses its current API 34 native casino view. Release and capture provenance accompany the images. New diagnostics tests cover partial command failures and unavailable values without inventing results.

## Verification and limits

The merged CLI suite passed 419 tests. Desktop lint and 37 logic tests passed locally. Required CI and packaged desktop checks must complete on the final primary branch before publication. The diagnostics menu was exercised on a physical TV while preserving five screensaver/sleep values. Slot Vision and Hearth have separate physical playback evidence in their own releases; this does not establish all-model support, physical 4K, reboot persistence or long thermal behavior.

The desktop supports macOS, Windows and Linux using the existing packaged test matrix. Follow its normal unsigned-package installation instructions where applicable. See [desktop documentation](DESKTOP.md), [screensaver integration](SCREENSAVERS.md) and the [full comparison](https://github.com/jeremykenedy/fire-tv-toolkit/compare/v4.2.0...v4.3.0).
