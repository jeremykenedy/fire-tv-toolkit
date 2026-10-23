# Fire TV Toolkit 4.4.2

Jellyfish Drift Classic and filmed Jellyfish Drift V2 are separate installation and selection targets. Classic keeps its original Android package and controls. V2 has its own package, filmed scenes, playback speed, scene randomization and optional clock. Both default to clock off.

Fire IPTV is pinned to the verified public 1.2.0 APK. Cloud Drift Clock, Starfield Drift, Nebula Drift, Aqua Surface Drift, Split-Flap Drift and Canopy Drift 1.1.0 provide an independent Show clock setting. Cloud and Split-Flap keep clock on by default; the other four default off.

## Upgrade

Update the CLI from its clean primary checkout with `firetv-updates --self --install toolkit --yes`, or fast-forward the checkout and run `npm ci` followed by `npm link`. Install the matching desktop package through the normal operating-system installer. Existing configuration stays in place.

Use `firetv-screensavers --install=jellyfish-drift,jellyfish-drift-v2 --yes` to install both editions. Installation does not select a screensaver or change timers. Existing apps update in place and retain their settings. Scene controls remain in each app's native settings.

## Verification and limits

All 447 CLI tests, 38 desktop tests and 76 focused installer/registry tests passed. The six clock releases were built from verified primary commits with their original signers, and their public APKs and checksums were downloaded and matched. Native visibility fixtures verify independent clock on/off behavior. Fire IPTV and both jellyfish release artifacts were independently verified against their published hashes.

The jellyfish previews are actual physical Fire TV captures with their clocks disabled. Clock controls do not redesign the existing scenes or add forward cloud flight. Device-specific installation and preservation evidence is tracked separately.

No breaking changes or settings migration are required.
