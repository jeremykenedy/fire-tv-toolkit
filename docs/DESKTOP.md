# Fire TV Toolkit desktop app

The desktop app browses the worldwide [iptv-org](https://github.com/iptv-org/iptv) catalog and plays online IPTV channels. Search channels, filter by country, language or category, save favorites, and choose another stream source when a channel has more than one. The catalog updates every twelve hours and keeps a saved copy for browsing during a catalog outage.

The Fire TV tools manage screensavers, home screens, OwnTV, Alexa wake, idle timers and protection. Connect the TV over ADB to use these controls. The app asks for native confirmation before changing the TV and reads settings back before reporting completion.

## Install

The desktop build workflow produces these formats:

| System                          | Format                     | Installation                                                                                                |
| ------------------------------- | -------------------------- | ----------------------------------------------------------------------------------------------------------- |
| macOS on Intel or Apple silicon | DMG                        | Open the disk image and drag Fire TV Toolkit to Applications.                                               |
| Windows x64                     | EXE                        | Run the installer and choose the installation folder.                                                       |
| Linux x64                       | Debian package or AppImage | Install the Debian package through the system package manager, or make the AppImage executable and open it. |

Desktop packages include Electron and Google's Platform Tools 37.0.1. End users do not need Node.js, Python or a separate ADB installation. Build downloads are pinned by version and SHA-256. The current workflow creates unsigned testing artifacts and does not publish releases.

## Watch IPTV

Open Live TV and choose a channel. Use the video controls to unmute or enter full screen. Choose another source when the broadcaster offers alternatives. Stream availability, regional restrictions and codec support depend on the source. HLS and formats supported by the bundled Chromium player can play in the app.

To watch on Fire TV, connect the TV and open Home & live TV. Install OwnTV, open it on the TV, and choose a remote playlist. Follow the address or QR code shown on the TV, enter its PIN, and add the worldwide playlist:

```text
https://iptv-org.github.io/iptv/index.m3u
```

Send it to the TV and start the import in OwnTV. The desktop player and Fire TV player connect directly to the online stream sources.

## Remove

On Windows, use the installed uninstaller or Windows Settings, Apps, Installed apps. The File menu can also open the uninstaller. On macOS, use File, Remove desktop app, or move the app from Applications to Trash. On Debian based Linux, remove the package with `sudo apt remove fire-tv-toolkit-desktop`. An AppImage can be deleted after closing it.

Removing the desktop application leaves TV apps and settings in place. Restore captured timers, undo optimizations, turn protection off or choose Amazon Home in the app before removing it if you want those TV changes undone. Saved device settings stay in the operating system's user application data folder, separated by device identity.

## Run and build from source

Use Node.js 22.13 or newer. From the repository root:

```sh
npm ci
npm --prefix desktop ci
npm --prefix desktop run prepare:adb
npm --prefix desktop start
```

Build an installer on its target operating system:

```sh
npm --prefix desktop run dist
```

On macOS, both Intel and Apple silicon builds can be produced with `npm --prefix desktop run dist -- --mac --x64 --arm64`. The GitHub Actions desktop workflow builds all three operating systems on their own hosted runners. It stores the installers as workflow artifacts.

Run validation with:

```sh
npm test
npm --prefix desktop test
npm --prefix desktop run lint
```

The terminal commands retain their existing dependencies and supported Node.js versions. Desktop dependencies live in their own package. Run `npm --prefix desktop ci` again after changing shared toolkit code so the desktop dependency contains the current source.
