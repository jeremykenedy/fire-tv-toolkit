<p align="center">
  <a href="https://github.com/jeremykenedy/fire-tv-toolkit#gh-light-mode-only"><picture><source media="(max-width: 600px) and (prefers-reduced-motion: reduce)" srcset="art/banner-mobile-still-light.be835efd4e0b.svg"><source media="(prefers-reduced-motion: reduce)" srcset="art/banner-still-light.ac99d0318bde.svg"><source media="(max-width: 600px)" srcset="art/banner-mobile-light.6e48e8453961.svg"><img src="art/banner-light.b1ee5b0d1bd2.svg#gh-light-mode-only" alt="Fire TV Toolkit" width="800"></picture></a>
  <a href="https://github.com/jeremykenedy/fire-tv-toolkit#gh-dark-mode-only"><picture><source media="(max-width: 600px) and (prefers-reduced-motion: reduce)" srcset="art/banner-mobile-still-dark.7d4d6d35a31d.svg"><source media="(prefers-reduced-motion: reduce)" srcset="art/banner-still-dark.02953d749d03.svg"><source media="(max-width: 600px)" srcset="art/banner-mobile-dark.6b997743de7a.svg"><img src="art/banner-dark.adc74a3d5b20.svg#gh-dark-mode-only" alt="Fire TV Toolkit" width="800"></picture></a>
</p>

<p align="center">Watch live TV and manage your Fire TV with a desktop app or CLI.</p>

<p align="center">
    <a href="https://github.com/jeremykenedy/fire-tv-toolkit/releases/latest"><img src="https://img.shields.io/github/v/release/jeremykenedy/fire-tv-toolkit" alt="Latest release"></a>
    <a href="https://github.com/jeremykenedy/fire-tv-toolkit/actions/workflows/tests.yml"><img src="https://github.com/jeremykenedy/fire-tv-toolkit/actions/workflows/tests.yml/badge.svg" alt="Tests"></a>
    <a href="https://github.com/jeremykenedy/fire-tv-toolkit/actions/workflows/gitguardian.yml"><img src="https://github.com/jeremykenedy/fire-tv-toolkit/actions/workflows/gitguardian.yml/badge.svg" alt="GitGuardian scan"></a>
    <a href="https://sonarcloud.io/summary/new_code?id=jeremykenedy_amazon-fire-tv-fixes"><img src="https://sonarcloud.io/api/project_badges/measure?project=jeremykenedy_amazon-fire-tv-fixes&metric=alert_status" alt="Quality Gate Status"></a>
    <a href="https://sonarcloud.io/summary/new_code?id=jeremykenedy_amazon-fire-tv-fixes"><img src="https://sonarcloud.io/api/project_badges/measure?project=jeremykenedy_amazon-fire-tv-fixes&metric=coverage" alt="Coverage"></a>
    <a href="https://app.codacy.com/gh/jeremykenedy/fire-tv-toolkit/dashboard"><img src="https://app.codacy.com/project/badge/Grade/f18b3347eae54aeea4251575b7b2de1f" alt="Codacy Badge"></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/License-Apache%202.0-blue.svg" alt="License: Apache 2.0"></a>
</p>

<p align="center">
    <a href="https://app.aikido.dev/repositories/3225041"><img src="https://app.aikido.dev/assets/badges/full-light-theme.svg" alt="Secured by Aikido" height="32"></a>
</p>

<p align="center">
    <a href="https://github.com/jeremykenedy"><img src="https://img.shields.io/github/followers/jeremykenedy?label=Follow%20me&amp;style=social" alt="Follow me"></a>
    <a href="https://github.com/jeremykenedy/fire-tv-toolkit"><img src="https://img.shields.io/badge/Star-this%20repo-yellow?logo=github" alt="Star this repo"></a>
    <a href="https://github.com/jeremykenedy/fire-tv-toolkit/stargazers"><img src="https://img.shields.io/github/stars/jeremykenedy/fire-tv-toolkit?style=social" alt="Stars"></a>
    <a href="https://github.com/sponsors/jeremykenedy"><img src="https://img.shields.io/badge/Sponsor-jeremykenedy-ea4aaa?logo=githubsponsors&amp;logoColor=white" alt="Sponsor"></a>
</p>

| Desktop App | CLI App |
|-------------|---------|
| Watch live TV and manage your Fire TV through a graphical interface. | Manage your Fire TV through guided terminal menus or command flags. |
| [Download for your computer](#desktop-app) | [Install the CLI](#cli-app) |

## Table of Contents

- [Desktop App](#desktop-app)
- [CLI App](#cli-app)
- [Features](#features)
- [Platform support](#platform-support)
- [Requirements](#requirements)
- [Documentation](#documentation)
- [License](#license)

## Desktop App

Browse live channels, save favorites, and manage screensavers, home screens and TV settings.

<p align="center">
  <a href="https://github.com/jeremykenedy/fire-tv-toolkit/releases/latest/download/Fire-TV-Toolkit-mac-arm64.dmg"><img src="art/screenshots/desktop-live-tv.png" alt="Fire TV Toolkit desktop app. Click to download for macOS Apple silicon." width="900"></a>
</p>

| macOS | Windows | Linux |
|-------|---------|-------|
| [Apple silicon DMG](https://github.com/jeremykenedy/fire-tv-toolkit/releases/latest/download/Fire-TV-Toolkit-mac-arm64.dmg) | [Windows x64 installer](https://github.com/jeremykenedy/fire-tv-toolkit/releases/latest/download/Fire-TV-Toolkit-win-x64.exe) | [AppImage](https://github.com/jeremykenedy/fire-tv-toolkit/releases/latest/download/Fire-TV-Toolkit-linux-x86_64.AppImage) |
| [Intel DMG](https://github.com/jeremykenedy/fire-tv-toolkit/releases/latest/download/Fire-TV-Toolkit-mac-x64.dmg) | | [Debian package](https://github.com/jeremykenedy/fire-tv-toolkit/releases/latest/download/Fire-TV-Toolkit-linux-amd64.deb) |

The graphic downloads the Apple silicon Mac app. Choose your platform above for another installer. Desktop installers include ADB and the app runtime; they are currently unsigned. See the [desktop guide](docs/DESKTOP.md) for installation and use.

## CLI App

Use guided menus or individual commands from your terminal. Requires Node.js 18 or later on macOS or Linux.

```bash
git clone https://github.com/jeremykenedy/fire-tv-toolkit.git
cd fire-tv-toolkit
node setup.js
```

Setup installs dependencies and links the commands after you confirm. Run `start` to open the guided menu.

```bash
start
firetv-screensavers
fire-iptv --install
```

See [TV setup](docs/SETUP.md) for ADB debugging and upgrades, or the [command reference](docs/COMMANDS.md) for every command and flag.

## Features

| Feature | What it does |
|---------|--------------|
| [Desktop live TV](docs/DESKTOP.md#watch-iptv) | Browse worldwide IPTV channels, filter sources and save favorites. |
| [TV guide and sports](docs/IPTV.md) | Install fire-iptv or OwnTV on your TV. |
| [Screensavers](docs/SCREENSAVERS.md) | Install ad-free screensavers and choose one from your computer or TV. |
| [Home screens](docs/LAUNCHER.md) | Switch between AT4K, LTvLauncher and Amazon Home. |
| [Alexa wake](docs/HOW-IT-WORKS.md#the-alexa-deep-sleep-fix) | Keep Alexa able to reach the TV during sleep. |
| [Idle timers](docs/TIMEOUTS.md) | Change sleep and screensaver delays. |
| [Setup protection](docs/GUARD.md) | Restore selected settings when Fire OS changes them. |
| [Guided setup and updates](docs/DESKTOP.md#guided-setup-and-updates) | Review app and setting changes before applying them. |
| [Diagnostics](docs/FEATURES.md#diagnostics-and-advanced-tools) | Inspect device and screensaver state or use the optional TV terminal. |
| [Restore settings](docs/UNINSTALLING.md) | Restore captured settings and remove selected apps. |

See the [feature guide](docs/FEATURES.md) for behavior and limits, or browse the [screenshot gallery](docs/SCREENSHOTS.md).

## Platform support

| Platform | Status |
|----------|--------|
| macOS desktop | Intel and Apple silicon packages; checked against a physical TV. |
| Windows and Linux desktop | Native installation, playback and removal checked in CI. |
| Terminal CLI | macOS tested; Linux tests pass in CI. Windows CLI is unsupported. |
| Fire TV Edition | Tested on Insignia AFTDEC012E, Fire OS 8.1.8.5. |
| Fire TV Stick and Cube | Not yet tested. |

## Requirements

- Desktop IPTV playback works without a TV connection.
- Fire TV tools need a TV on the same network with [ADB debugging enabled](docs/SETUP.md).
- The CLI needs Node.js 18 or later and ADB; setup can install ADB for you.

## Documentation

| Guide | Contents |
|-------|----------|
| [All documentation](docs/index.md) | Complete guide and release index. |
| [Desktop app](docs/DESKTOP.md) | Downloads, playback, setup and removal. |
| [TV setup](docs/SETUP.md) | Developer mode, ADB debugging and CLI upgrades. |
| [Features](docs/FEATURES.md) | Feature details, defaults and limitations. |
| [Screensavers](docs/SCREENSAVERS.md) | Available apps, install IDs and verified downloads. |
| [Commands](docs/COMMANDS.md) | CLI commands and flags. |
| [Integrations](docs/INTEGRATIONS.md) | Connected apps, services and upstream sources. |
| [Screenshots](docs/SCREENSHOTS.md) | Desktop, TV, screensaver and terminal galleries. |
| [Troubleshooting](docs/TROUBLESHOOTING.md) | Connection and settings problems. |
| [Development](docs/DEVELOPMENT.md) | Source builds, tests and release preparation. |
| [Changelog](CHANGELOG.md) | Changes and upgrade notes. |

## License

This project is licensed under the [Apache License 2.0](LICENSE).
