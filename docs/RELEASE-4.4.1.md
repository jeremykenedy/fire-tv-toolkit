# Fire TV Toolkit 4.4.1

Home Redirect update checks now find the helper's Android release when the newest Toolkit release contains only desktop installers. The check compares Android app versions correctly instead of treating the repository's desktop tag as the helper version.

## Major changes

The desktop and CLI search the latest 100 release entries for the most recently published stable release containing the exact `firetv-home-redirect.apk` asset when the newest release has none. A different APK cannot satisfy this lookup.

The verified APK's compiled package, version name and version code determine the published helper version. Results show both its app version and repository tag. The current published helper is app 1.2.6, version code 10, attached to Toolkit v3.9.1. A matching installed helper is reported as current.

## Minor changes and fixes

The bounded compiled-manifest reader accepts a literal Android version name for display. Existing checksum, package and higher-version installation checks remain in place. The CLI and desktop dependency metadata agree on 4.4.1.

## Upgrade guide

From Toolkit 4.4.0, check and install the CLI update from its clean primary checkout:

```bash
firetv-updates --self --check
firetv-updates --self --install toolkit --yes
```

Earlier 4.x CLI installations can fast-forward a clean `main` checkout to the current primary branch, run `npm ci`, then `npm link`. Preserve uncommitted edits separately first. The `update` alias change introduced in 4.4.0 is described in its [upgrade guide](https://github.com/jeremykenedy/fire-tv-toolkit/blob/v4.4.0/docs/RELEASE-4.4.0.md).

Desktop users install the matching published package through the normal operating-system installer, then reopen it and check the displayed version. Saved desktop data and ignored CLI device configuration stay in place. No schema migration, cache clearing, environment change or TV reset is needed.

Connect the intended TV and use **Check for updates** to confirm the helper's installed and published versions. Checking does not activate Home Redirect or change the launcher. See [published update controls](https://github.com/jeremykenedy/fire-tv-toolkit/blob/v4.4.1/docs/UPDATES.md).

For recovery, reinstall the previous Toolkit desktop installer or use a separate clean 4.4.0 CLI checkout with the saved device configuration. This does not downgrade any TV application. Preserve app data if Android rejects a downgrade.

## Breaking changes

None. CLI Node 18 and desktop development Node 22.13 minimums are unchanged. Existing app settings, selected screensavers and launcher defaults are unchanged. Check failures remain unavailable; they are not reported as current or successfully updated.

## Verification and limits

Host regressions cover desktop-only releases, an unrelated APK, prereleases, Android version comparisons and inspection-file cleanup. The actual published helper's 37,506 bytes were downloaded and verified against its published SHA-256; its compiled manifest identifies Home Redirect 1.2.6, code 10, matching the helper installed on the new Fire TV.

All 446 CLI tests, 38 desktop tests and ESLint pass. The packaged native macOS 4.4.1 app checked the real public Toolkit release and all 37 installed catalog applications on the new TV. Its Home Redirect row correctly shows app 1.2.6, repository v3.9.1 and a matching installed version, with no install button. Cross-platform package results are recorded with the release before publication.

The history lookup is bounded to 100 release entries. API failures, rate limits or an asset outside that window remain unavailable. Android still enforces the installed signing certificate during replacement. Unpublished graphics candidates are excluded from this patch.

[Compare v4.4.0 with v4.4.1](https://github.com/jeremykenedy/fire-tv-toolkit/compare/v4.4.0...v4.4.1)
