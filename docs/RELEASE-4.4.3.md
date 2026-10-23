# Fire TV Toolkit 4.4.3

Adds Black Screen Dream as a separate screensaver installation and selection option. It displays a plain black screen without a clock, imagery or animation.

## Upgrade guide

Update the CLI from its clean primary checkout with `firetv-updates --self --install toolkit --yes`, or fast-forward the checkout and run `npm ci` followed by `npm link`. Desktop users install the matching package normally. Existing app data and configuration remain intact.

Install with `firetv-screensavers --install=black-screen-dream --yes`. Select it separately with `screensaver --set=black-screen-dream`. Installation alone does not change the selected screensaver or timers.

## Major changes

Black Screen Dream has its own Android package and signed release. The installer uses its published APK and checksum.

## Minor changes and fixes

The CLI and desktop catalogs expose the same new entry. Other catalog options retain their identities and defaults.

## Breaking changes

None. No configuration migration or TV reset is required.
