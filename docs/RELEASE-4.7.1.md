# Fire TV Toolkit 4.7.1

Refresh reviewed companion application baselines while preserving existing
Toolkit controls, profiles, configuration and update verification.

## Upgrade guide

Desktop users on 4.7.0 can replace the app with the matching 4.7.1 installer.
Quit the previous desktop app before replacement. Keep its Application Support
data directory to retain named TV profiles, favorites and restoration history.
Older 4.x installations follow the same replacement path; review the
[4.7.0 upgrade guide](https://github.com/jeremykenedy/fire-tv-toolkit/blob/v4.7.0/docs/RELEASE-4.7.0.md)
for earlier source-install details.

An existing clean primary-branch CLI installation can use:

```sh
firetv-updates --self --install toolkit --yes
```

The established updater fast-forwards a clean main checkout, runs `npm ci` and
refreshes `npm link`. It preserves ignored `.env` configuration and custom
screensaver sources. It refuses dirty or non-primary checkouts rather than
silently switching them. No configuration reset or TV reboot is required.

## Breaking changes

None. CLI Node 18+ and desktop-source Node 22.13+ minimums remain. Package and
signing identities, app defaults, Home selections, saved profiles and settings
remain. UI installation remains separate from choosing Use.

## Major changes

None. This patch refreshes existing catalog contracts without adding new
Toolkit screensaver entries or changing the default selection.

## Minor changes and fixes

Fire TV UI uses public 1.14.0/code 75, including its optional static palettes and
current saver catalog. Its 17,080,529-byte APK was downloaded anonymously and
matched SHA-256 `08ca77dd4c8a5bea084872dff62b6fd8bea813da70eea085958ad024c4a4e05e`.
The paired 8,505,979-byte icon archive matched
`ddec4b0ca9b18fef0abd386414ad96e5551709ee86c3744baa1cb97338ce6c66`.
All 32 PNGs remain Full HD. Package, code, SDK metadata and production signer
were verified; existing installation and Home-selection behavior remain.

Contour Flow uses public 1.1.0/code 6, with its existing package and DreamService.
The 66,572-byte signed APK and checksum were downloaded anonymously and matched
SHA-256 `6b4302ee3220c25df5b40c3e7ff6d72d6c859b4403203f0577a01a9b7cc2ebf6`.
Its production signer remains
`4b9b57d5eb49024959ea6eb2f87e2cc41a1a1db128ab8b58070b3ddfbefc9d27`.
Latest-published update checks remain independent of this reviewed installation pin.

## Security and verification

No new dependency, permission, network behavior or preference schema is added.
Published APK hashes, Android identity, version checks and signer enforcement
remain required. Native saver evidence belongs to the companion release; a host
pin does not establish a new physical TV result.

The public pins and actual download preparation helpers are verified. Current
packaged About/update captures show this patch version; unchanged route captures
remain explicitly historical. Relevant package metadata and essential exact-head
CI are verified before publication. Packages remain unsigned; the existing macOS
Gatekeeper limitation remains.

## Rollback and recovery

Keep the previous verified installer and app-data directory. A desktop rollback
requires no profile migration. Do not clear TV baselines or uninstall companion
apps merely to roll back host metadata. Prefer a newer verified corrective
release when an app replacement fails.

[Compare 4.7.0 to 4.7.1](https://github.com/jeremykenedy/fire-tv-toolkit/compare/v4.7.0...v4.7.1).
