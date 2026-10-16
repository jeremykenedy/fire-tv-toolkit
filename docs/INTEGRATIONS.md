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
