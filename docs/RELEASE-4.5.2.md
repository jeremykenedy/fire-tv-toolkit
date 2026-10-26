# Fire TV Toolkit 4.5.2

Update the desktop runtime and build-time URI parser for published security fixes. This patch preserves the CLI, all 34 screensaver entries, defaults, device configuration and runtime features.

## Upgrade guide

Desktop users on 4.5.1 or earlier should install the matching 4.5.2 macOS, Windows or Linux package. The installers retain application data, favorites, settings and captured device baselines. Replacing the desktop application updates its bundled Electron runtime; updating only the global CLI does not replace an installed desktop binary.

For an existing clean main-branch CLI installation:

```sh
firetv-updates --self --install toolkit --yes
```

A source installation can instead fast-forward to verified primary, then run `npm ci` and `npm link`. Desktop-source Node 22.13+ and CLI Node 18+ requirements are unchanged. No TV connection, app update, screensaver selection, timer, account or device permission change is needed for this patch.

## Breaking changes

None. Public commands, stored configuration, package identities, catalog contents, selected defaults and supported runtime floors are unchanged.

## Major changes

No new product feature. Named saved TV profiles and the Nibbles HD catalog addition are outside this security patch.

## Minor changes and fixes

- Pin Electron 44.9.3 and align desktop/CLI package versions at 4.5.2.
- Resolve fast-uri 3.1.9 through the existing compatible dependency range without a new override.
- Assert the actual Electron runtime version in each installed-package test.

## Security

[Electron GHSA-jr5w-w6x2-84p9](https://github.com/advisories/GHSA-jr5w-w6x2-84p9) affects the prior 44.8.0 runtime; 44.9.1 and later contain the compromised eMudhra intermediate-certificate mitigation. [Official 44.9.3 notes](https://github.com/electron/electron/releases/tag/v44.9.3) also record upstream backports.

The existing build-time fast-uri 3.x dependency is fixed at 3.1.9 for [scheme spoofing](https://github.com/advisories/GHSA-w74x-v6f9-j3xg), [host confusion](https://github.com/advisories/GHSA-wjr9-j795-jxcr), [path equivalence](https://github.com/advisories/GHSA-xhq7-xmqj-769h) and [scheme injection](https://github.com/advisories/GHSA-333x-w4r6-6crp). It enters through the packaging toolchain, not a new app network feature. No tracking, library service or permission is added.

## Verification and limits

The release requires CLI tests/coverage, desktop lint and unit tests, and the normal three-OS installed-package CI with actual patched Electron checks. Seven desktop installers and SHA256SUMS must be verified before publication. Current native package screenshots and final results are recorded before release. No physical TV or network configuration change is part of this patch.

## Rollback

Keep existing application data and retry the matching installer if installation fails. Reverting to 4.5.1 restores the affected Electron runtime; use a newer signed or verified corrective release for regressions instead of clearing device or application data. Source configuration and device baselines need no migration.

[Desktop guide](https://github.com/jeremykenedy/fire-tv-toolkit/blob/v4.5.2/docs/DESKTOP.md), [update guide](https://github.com/jeremykenedy/fire-tv-toolkit/blob/v4.5.2/docs/UPDATES.md), [compare v4.5.1 to v4.5.2](https://github.com/jeremykenedy/fire-tv-toolkit/compare/v4.5.1...v4.5.2).
