# Integrations

The toolkit installs optional TV apps from their own releases. Those apps and bundled dependencies keep their own licenses.

| Integration | Purpose | Details |
|-------------|---------|---------|
| ADB | Connect to the TV and read or change settings. | [How it works](HOW-IT-WORKS.md) |
| GitHub Releases | Download APKs and verify published or pinned SHA-256 values. | [Screensavers](SCREENSAVERS.md#how-downloads-are-checked) |
| AT4K | Optional home screen, installed from the author's release. | [Home screen](LAUNCHER.md) |
| LTvLauncher | Optional home screen, pinned by release and checksum. | [Home screen](LAUNCHER.md) |
| fire-iptv | TV guide, sports and provider libraries with automatic live TV setup. | [TV guide and IPTV](IPTV.md) |
| OwnTV | Alternative TV player for playlists and provider content. | [TV guide and IPTV](IPTV.md) |
| iptv-org | Worldwide channel catalog used by the desktop player and TV playlists. | [Desktop app](DESKTOP.md#watch-iptv) |
| Fire OS | Alexa wake, screensaver, idle and accessibility settings. | [How it works](HOW-IT-WORKS.md) |

## Upstream sources

| Project | Original author or team | Use |
|---------|-------------------------|-----|
| [Aerial Views](https://github.com/theothernt/AerialViews) | theothernt | Installed from the original release. |
| [AndroSaver](https://github.com/Whichcraft/androsaver) | Whichcraft | The toolkit uses the maintained fork. |
| [Snoozy](https://github.com/avadhesh18/Snoozy) | avadhesh18 | The toolkit uses the maintained fork. |
| [AT4K Launcher](https://github.com/avadhesh18/at4k) | avadhesh18 | Installed unmodified from the original release. |
| [LTvLauncher](https://github.com/leanbitlab-org/LtvLauncher) | LeanBitLab | FLauncher fork, installed unmodified from its own release. |
| [OpenIPTV](https://github.com/Hunter-Clipper/OpenIPTV) | OpenIPTV contributors | fire-iptv is a separate fork with its own license. |
| [iptv-org](https://github.com/iptv-org/iptv) | iptv-org contributors | Public channel metadata and stream links. |

The toolkit's [Apache License 2.0](../LICENSE) applies to this repository's own code. See each upstream repository and the desktop application's bundled notices for third party license terms.

## Screensaver gallery media

The Cloud Drift Clock 2.0 screenshot contains filmed cloud flight by [anotherview](https://www.youtube.com/watch?v=kKPvF0rwqHA), licensed under [Creative Commons Attribution 3.0](https://creativecommons.org/licenses/by/3.0/). The footage was edited into a silent loop and its native screenshot resized for this gallery. The license applies to that media independently of the Toolkit source license.

The Blue Meridian 1.0.1 screenshot contains NASA Blue Marble surface and cloud imagery and NASA/NOAA Black Marble night lights. [Tagged source provenance](https://github.com/jeremykenedy/blue-meridian/blob/v1.0.1/assets/SOURCES.json) records authors, primary sources and modifications. No endorsement is implied. [Gallery provenance](screenshots/candidate-sources.json) records the actual captures and released APK hashes.
