# TV setup

Enable ADB debugging before using the Fire TV tools. Desktop IPTV playback works without a TV connection.

## Developer mode and ADB debugging

Before running the installer, turn on Developer Mode and ADB debugging on the
TV itself. The exact menu names vary a little by Fire TV model and software
version. On a Fire TV Edition set (screenshots below), the path is `Settings >
Device & Software`:

<p align="center"><img src="screenshots/settings-device-software.png" alt="Settings, Device and Software screen" width="700"></p>

1. **Turn on Developer Mode:** open `About`, then select "Your TV" 7 times in
   a row until it says "You are now a developer!"

<p align="center"><img src="screenshots/settings-about.png" alt="About screen showing Your TV and Network entries" width="700"></p>

2. **Turn on ADB debugging:** back out to `Device & Software`, open
   `Developer options`, and turn `ADB debugging` on.

<p align="center"><img src="screenshots/settings-developer-options.png" alt="Developer options screen with ADB debugging set to on" width="700"></p>

3. **Find your TV's IP address:** back in `About`, open `Network`. Numbers
   below are blurred out, this is just to show where to look on your own TV.

<p align="center"><img src="screenshots/settings-network.png" alt="Network screen showing the IP address field, numbers blurred" width="700"></p>

The installer asks you to confirm this and prompts for the IP address before
doing anything else.

## CLI installation

For the desktop app, download your operating system's installer from [Releases](https://github.com/jeremykenedy/fire-tv-toolkit/releases/latest) and follow the [desktop guide](DESKTOP.md). The installers are currently unsigned.

For the terminal CLI:

1. Clone the repo and run the setup script:

   ```bash
   git clone https://github.com/jeremykenedy/fire-tv-toolkit.git
   cd fire-tv-toolkit
   node setup.js
   ```

2. Pick what to do on the checklist: install the dependencies and link every command onto your PATH, and launch the guided app. Nothing runs until you confirm.
3. In the guided app, confirm developer mode is on and enter your TV's IP address. It is saved to `.env` so you are not asked again.
4. Choose what to set up: the Alexa fix, screensavers, timeouts, and optionally the AT4K or LTvLauncher home screen.

Run `start` any time to open the guided menu again. To install by hand instead: `npm install`, `npm link`, then `start`.

## Upgrading the CLI

1. Pull the latest code: `git pull`.
2. Run `node setup.js` and choose to install and link the commands.
3. Run `start` to pick up anything new, such as the AT4K or LTvLauncher home screen.

Your saved IP and timeout baselines in `.env` are kept. Coming from version 2
(`amazon-fire-tv-fixes`), the commands were renamed: remove the old links with
`npm uninstall -g amazon-fire-tv-fixes` before step 2. See the
[Changelog](../CHANGELOG.md) for what changed.
