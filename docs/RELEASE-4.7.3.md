# Fire TV Toolkit 4.7.3

Refresh the verified Fire TV UI and Black Screen companions while preserving Toolkit controls, named TVs, configuration, Home choices and update verification. This is a host patch: the new appearance and card features belong to the separately installed UI companion.

## Upgrade guide

Desktop users on 4.7.2 can replace the app with the matching 4.7.3 installer. Quit the previous app and retain its Application Support data for named TVs, favorites and restoration history. Older 4.x installations follow the same replacement path; the [4.7.0 upgrade guide](https://github.com/jeremykenedy/fire-tv-toolkit/blob/v4.7.0/docs/RELEASE-4.7.0.md) covers earlier source-install details.

A clean primary-branch CLI checkout can use the established updater:

```sh
firetv-updates --self --install toolkit --yes
```

It fast-forwards clean `main`, runs `npm ci` and refreshes `npm link`, preserving ignored `.env` configuration and custom screensaver sources. Dirty or non-primary checkouts are refused. No TV reboot or configuration reset is required.

Updating Toolkit alone does not replace installed TV apps. Check their published updates in Toolkit, or use the existing installation controls for Fire TV UI and Black Screen. Installing a screensaver does not select it or change its timer. Installing a launcher does not change the current Home choice.

## Breaking changes

None. CLI Node 18+ and desktop-source Node 22.13+ remain the minimums. App identities, signing expectations, host routes and saved profiles remain unchanged. No dependency or preference schema change is introduced.

## Major changes

None for the Toolkit host. This patch refreshes two existing companion installation baselines.

## Minor changes and fixes

- [Fire TV UI 1.16.0/code 77](https://github.com/jeremykenedy/fire-tv-ui/releases/tag/v1.16.0) adds named saved setups, independent animated overlays, holiday palettes and global/per-channel card timers. These are configured in the TV UI; existing saved defaults are preserved. Video wallpaper setups retain source references, so the original video must remain accessible.
- [Black Screen Dream 1.0.1/code 2](https://github.com/jeremykenedy/black-screen-dream/releases/tag/v1.0.1) keeps opaque black rendering and requests minimum brightness only for its own preview or Dream window. Normal brightness is restored on exit. No global display or power setting changes.
- All other app pins and Home-selection behavior remain unchanged. Home Redirect does not need rebuilding for this patch.

| Public artifact | Bytes | SHA-256 |
| --- | ---: | --- |
| Fire TV UI APK | 17,138,328 | `171f16f9b4777d59cd26906b3f6684ef72c3b4586e0af090b32be69f9980f487` |
| UI icon ZIP | 8,505,979 | `161660ecad562d6813734ce922e44a08d554262a72b8144c5f0734cc1701f8c7` |
| Black Screen APK | 21,234 | `3281db249bcf776ffcd04e55213d86dcda0efc1626881c8895051602567da97c` |

All 32 icon images remain Full HD. APK package identities, version codes and existing production signers were verified using the actual Toolkit download and icon-preparation helpers against public releases.

## Security and verification

Reviewed hashes and update verification remain in place. The added Black Screen pin fixes the installation baseline while the existing update checker continues to discover newer releases. Local verification passed 503 CLI tests, 56 desktop tests, desktop lint, four README checks, actual public companion downloads and the packaged macOS arm64 application. Refreshed native About/update screenshots record the exact embedded companion pins using isolated sample data. README and gallery rendering are checked at desktop and phone widths. Required CI covers Node 18/20 and the macOS, Windows and Linux desktop matrix, including native package, install and removal checks.

Desktop packages remain unsigned with the existing macOS Gatekeeper limitation. Companion device checks do not establish universal animation performance, Alexa or receiver fixes. Black Screen brightness requests were verified on API 28 and API 30 Fire TVs; panel luminance and an off-like appearance were not measured. LCD and QLED backlight glow may remain. See the companions' release notes for their full verification limits.

## Rollback and recovery

Keep the previous verified installer and app-data directory. No profile migration is required. Restore the host app without resetting TV baselines or uninstalling companion apps. Prefer a newer corrective release for a TV companion rather than uninstalling and losing its settings.

[Launcher guide](https://github.com/jeremykenedy/fire-tv-toolkit/blob/v4.7.3/docs/LAUNCHER.md) | [Screensaver guide](https://github.com/jeremykenedy/fire-tv-toolkit/blob/v4.7.3/docs/SCREENSAVERS.md) | [Compare 4.7.2 to 4.7.3](https://github.com/jeremykenedy/fire-tv-toolkit/compare/v4.7.2...v4.7.3).
