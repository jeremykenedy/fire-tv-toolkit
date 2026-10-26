# Fire TV Toolkit 4.5.0

Skycast Weather joins the CLI and desktop screensaver catalog. It combines real city forecasts with filmed cloud flight, and its optional clouds-only mode hides all scene text and weather requests. This is a compatible new catalog feature, so the Toolkit version advances from 4.4.4 to 4.5.0.

## Upgrade guide

From an existing clean Toolkit checkout, run:

```sh
firetv-updates --self --install toolkit --yes
```

Alternatively, fast-forward to the verified primary branch, then run `npm ci` and `npm link`. Desktop users install the matching macOS, Windows or Linux package through their operating-system installer. The CLI still requires Node 18 or newer; source desktop builds require Node 22.13 or newer. No configuration migration, account reset, TV reboot or ADB restart is needed.

Installing the Toolkit does not automatically install or select Skycast. Install it explicitly:

```sh
firetv-screensavers --install=skycast-weather --yes
screensaver --set=skycast-weather
```

Open Skycast Settings to choose a city, metric/imperial units, 1/3/5/7 days and Gentle/Flowing playback. Show weather information defaults ON; turn it OFF for clouds without scene text or scene weather requests. Saved location and display choices remain retained. City search and forecasts use Open-Meteo under its separate service conditions, including noncommercial use of the configured free endpoint. Clouds are an independent ambient film, not the selected city's actual weather.

Updating the same Android package with the same signer retains preferences. Removing the saver is separate and requires explicit confirmation:

```sh
firetv-screensavers --uninstall=skycast-weather --force
```

## Breaking changes

None. Existing registry entries, selected defaults, device settings, Android app identities, runtime floors and update behavior are unchanged. Skycast is an additional entry rather than a replacement for Cloud Drift Clock or another saver.

## Major changes

- Skycast Weather 1.0.0 is installable and selectable through the existing verified-release flow used by both CLI and desktop.
- The catalog links the app's five-row local schema and accurate scene/forecast controls, including its all-text visibility switch. No generic host settings editor is claimed.

## Minor changes and fixes

- Add an untouched current physical Fire TV screenshot, responsive gallery derivatives and exact source/APK provenance.
- Preserve the film creator's CC BY 3.0 credit and separate Open-Meteo conditions alongside the Apache-2.0 Toolkit code.
- Add CLI fixture coverage proving the Weather install/select flow without contacting a physical TV.

## Verification and limits

The actual public Skycast APK and sidecar were downloaded and verified: SHA-256 `b8680ebc7314e8687281e5d405aa84d1b0f38d1f6505193f652b96fc9cf0e7e0`, 39,552,020 bytes, original certificate retained. Its physical API 28 code 4 normal idle Dream, OFF/ON controls, persistence, invalid writes, forecast layouts and clean approximately 25 compositor presents/s evidence are qualified in the [tagged upstream verification guide](https://github.com/jeremykenedy/skycast-weather/blob/v1.0.0/docs/verification.md). Source film 25 fps, slowed playback and screenrecord capture rates are distinct. No every-device, native 4K, extended thermal or owner visual-acceptance claim is made.

The release pipeline runs CLI tests, desktop tests/lint and native packaged install/lifecycle checks on macOS, Windows and Linux. Its isolated desktop fixture uses synthetic IPTV content and no connected TV. Screenshot provenance identifies exact packaged captures and historical images separately. All seven standard desktop installers/archives and their SHA256SUMS are verified after publication; no paid code-signing or notarization claim is made.

## Security and data integrity

User-initiated downloads retain existing checksum, package and version verification. This registration adds no background update service, analytics or arbitrary content URL. Skycast weather requests are an explicit app content feature; its film is bundled offline. Selecting the saver and changing timers remain separate user actions.

## Rollback

Reinstall desktop 4.4.4 or use a clean CLI checkout of `v4.4.4`, followed by `npm ci` and `npm link`. This does not uninstall or downgrade TV apps or erase their settings. Select another saver before intentionally removing Skycast; Android can reject lower-version-code package downgrades.

[Configuration and app contract](https://github.com/jeremykenedy/fire-tv-toolkit/blob/v4.5.0/docs/SCREENSAVERS.md#skycast-weather-10), [screenshots](https://github.com/jeremykenedy/fire-tv-toolkit/blob/v4.5.0/docs/SCREENSHOTS.md), [compare v4.4.4 to v4.5.0](https://github.com/jeremykenedy/fire-tv-toolkit/compare/v4.4.4...v4.5.0).
