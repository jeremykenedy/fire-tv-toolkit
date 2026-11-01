# Fire TV Toolkit 4.7.4

Refresh the verified Fire TV UI installation baseline to 1.17.0. Toolkit profiles, commands, installation verification and other companion pins remain unchanged. This is a host patch; the new controls belong to the separately installed TV UI.

## Upgrade guide

Desktop users on 4.7.3 can replace the app with the matching 4.7.4 installer. Quit the previous app and retain its Application Support data for named TVs, favorites and restoration history. Older 4.x installations follow the same replacement path; the [4.7.0 upgrade guide](https://github.com/jeremykenedy/fire-tv-toolkit/blob/v4.7.0/docs/RELEASE-4.7.0.md) covers earlier source installations.

A clean primary branch CLI checkout can run:

```sh
firetv-updates --self --install toolkit --yes
```

The updater fast forwards clean `main`, runs `npm ci` and refreshes `npm link`, preserving ignored `.env` configuration and custom sources. Dirty or non-primary checkouts are refused. No configuration migration or TV reboot is required.

Updating Toolkit alone does not replace TV apps. Use its existing Fire TV UI installation or published update controls to install the companion. Installing a launcher preserves the current Home choice. The extra UI controls are optional; existing layouts, names and icons remain until changed.

## Breaking changes

None. CLI Node 18+ and desktop source Node 22.13+ requirements, app identities, profile data, signing expectations and defaults stay unchanged. No dependency or host preference schema changes are introduced.

## Major changes

None in the Toolkit host. This patch refreshes an existing companion installation baseline.

## Minor changes and fixes

- [Fire TV UI 1.17.0/code 78](https://github.com/jeremykenedy/fire-tv-ui/releases/tag/v1.17.0) adds 16 receiver and soundbar brand icons, bringing the companion archive to 48 Full HD images.
- Individual tiles can use factory icons while other tiles keep their selected icon pack. HDMI inputs can be renamed and restored to their factory names without changing their launch identity.
- The companion's Settings > Network and IP shows the physical connection's addresses, prefix, gateway and DNS. Configure IP opens the TV's supported network settings. Toolkit does not silently change addressing or router reservations.
- All other app pins and Home selection behavior remain unchanged. Home Redirect does not need rebuilding for this patch.

| Public artifact | Bytes | SHA-256 |
| --- | ---: | --- |
| Fire TV UI APK | 21,460,807 | `feec52050090718424e7bada545d8b460583704ffa2fc5af28f187e863264df8` |
| UI icon ZIP | 12,818,195 | `697e1b1df0fa952da50e99b4cd8f575731e6a074cf789c7ddcfc5f29dc471f1c` |

## Verification and limits

Actual Toolkit `downloadApk` and `prepareUiIcons` helpers verified the public APK identity, version code, production signer, byte count, SHA-256 and all 48 Full HD icons. Local verification includes 503 CLI tests, 56 desktop tests, desktop lint and the packaged macOS arm64 capture with isolated sample data and no TV connection. Required CI covers Node 18/20, native macOS/Windows/Linux package checks and the documentation site.

Desktop packages retain their existing unsigned status and macOS Gatekeeper limitation. This companion update does not establish a receiver power or Alexa fix. Native static IP availability depends on the TV's settings; DHCP reservations are configured separately in the router.

## Rollback and recovery

Keep the previous verified host installer and app-data directory. No profile migration is required. Restore the host without resetting TV baselines or uninstalling companion apps. Prefer a newer corrective companion release over uninstalling and losing its settings.

[Launcher guide](https://github.com/jeremykenedy/fire-tv-toolkit/blob/v4.7.4/docs/LAUNCHER.md) | [Screenshots](https://github.com/jeremykenedy/fire-tv-toolkit/blob/v4.7.4/docs/SCREENSHOTS.md) | [Compare 4.7.3 to 4.7.4](https://github.com/jeremykenedy/fire-tv-toolkit/compare/v4.7.3...v4.7.4).
