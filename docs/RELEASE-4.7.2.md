# Fire TV Toolkit 4.7.2

Candidate preparation only. The companion UI 1.15 native gate is still pending.
Do not publish this Toolkit release or treat its local candidate pin as a public
installation baseline until the final upstream artifacts are verified.

Refresh the reviewed Fire TV UI companion while preserving Toolkit controls,
named TVs, configuration, Home choices and update verification.

## Upgrade guide

Desktop users on 4.7.1 can replace the app with the matching 4.7.2 installer after
publication. Quit the previous app and retain its Application Support data for
named TVs, favorites and restoration history. Older 4.x installations follow the
same replacement path; the [4.7.0 upgrade guide](RELEASE-4.7.0.md) covers earlier
source-install details.

A clean primary-branch CLI checkout can use the established updater once this
release is public:

```sh
firetv-updates --self --install toolkit --yes
```

It fast-forwards clean `main`, runs `npm ci` and refreshes `npm link`, preserving
ignored `.env` configuration and custom screensaver sources. Dirty or non-primary
checkouts are refused. No TV reboot or configuration reset is required.

## Breaking changes

None planned. CLI Node 18+ and desktop-source Node 22.13+ remain the minimums.
App identities, signing expectations, host routes and saved profiles remain.
Installing Fire TV UI remains separate from choosing Use.

## Major changes

None for the Toolkit host. This patch refreshes the existing companion baseline.

## Minor changes and fixes

The intended Fire TV UI 1.15 companion adds optional horizontal app rows, built-in
artwork treatments and short settings transitions while retaining its existing
defaults. Final feature wording, APK/icon identities and verification results must
come from the approved public companion release. They are not new Toolkit host
controls or a claim of physical Home/receiver acceptance.

All other reviewed app pins and Home-selection behavior remain unchanged. The
release guide now distinguishes a normal companion refresh from a change to the
separate legacy Home Redirect helper, which need not be rebuilt for this patch.

## Security and verification

No dependency, host permission, network behavior or preference schema change is
introduced. Exact public APK/icon size/hash checks, Android package/version/SDK
metadata and production signer checks remain required. Local checks pass: 501 CLI tests, 56 desktop tests, desktop lint and the actual
packaged macOS arm64 About/update capture flow with isolated sample data. The
embedded candidate UI pin and version 4.7.2 were read back from that package.
Public download-helper checks, browser documentation review and exact-head/main
CI remain pending.

Desktop packages remain unsigned with the existing macOS Gatekeeper limitation.
Native behavior belongs to the companion's actual verification record; updating
a host pin does not establish a new physical Fire TV result.

## Rollback and recovery

Keep the previous verified installer and app-data directory. No profile migration
is required. Restore the host app without resetting TV baselines or uninstalling
companion apps. Prefer a newer verified corrective release if replacement fails.

[Compare 4.7.1 to 4.7.2](https://github.com/jeremykenedy/fire-tv-toolkit/compare/v4.7.1...v4.7.2).
