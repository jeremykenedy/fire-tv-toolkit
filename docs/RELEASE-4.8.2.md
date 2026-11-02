# Fire TV Toolkit 4.8.2

The independent UI preflight now verifies the supplied APK's actual signing certificate against the pinned production signer. It reports an unavailable verifier, invalid signature or signer mismatch without approving installation.

## Upgrade guide

Desktop users on 4.8.1 or earlier 4.x releases can quit the app and replace it with the matching 4.8.2 installer. Retain the application data directory to keep saved TVs, favorites and restoration history. For earlier source installations, see the [4.7.0 upgrade guide](https://github.com/jeremykenedy/fire-tv-toolkit/blob/v4.7.0/docs/RELEASE-4.7.0.md).

For a clean CLI checkout on `main`, run:

```sh
firetv-updates --self --install toolkit --yes
```

The updater fast forwards a clean primary checkout, runs `npm ci` and refreshes `npm link`, while preserving ignored `.env` settings and custom sources. No profile migration, companion update or TV reboot is required. The optional local contract workflow is described in the [4.8.0 guide](https://github.com/jeremykenedy/fire-tv-toolkit/blob/v4.8.0/docs/RELEASE-4.8.0.md).

## Breaking changes

A supplied APK with a different or invalid signer is reported as a blocker. If Android SDK build tools or Java cannot run, verification is unavailable and remains a blocker; install the tools and retry when using this optional check. Previously the signer was not verified. Existing profiles, launcher choices, companion pins and defaults are unchanged. CLI requires Node 18 or later; desktop source builds require Node 22.13 or later.

## Major changes

The preflight checks a private copy of the supplied APK with the locally installed Android SDK's `apksigner`, comparing its single certificate to the existing production certificate pin. The copy is removed after inspection. An artifact contract cannot select the verifier or prove its own provenance.

Source build provenance and published release verification remain unverified. Production installation remains blocked pending a qualified release, UI parity, migration, recovery and native hardware acceptance. A matching signer alone does not authorize installation.

## Minor changes and fixes

- Display distinct results for an unavailable verifier, invalid signature and mismatched signer.
- Refresh the packaged macOS desktop screenshots using isolated sample data and fake ADB.

## Verification and rollback

Signer and preflight tests cover matching, mismatched, invalid and unavailable verification, along with preservation of saved profiles and the closed installation gate. Desktop installers are unsigned; macOS Gatekeeper restrictions apply. Three-platform packaging and primary-branch release checks must pass before publication.

Keep the previous verified installer and application data for rollback. Preflight changes no TV settings. If a separately selected Home switch needs recovery, reconnect to the same TV and run:

```sh
firetv-launcher --use=amazon
```

This changes Home selection; the preflight only displays the recovery command. Do not uninstall the existing UI or assume Android permits a lower-version APK as a rollback.

[Launcher guide](https://github.com/jeremykenedy/fire-tv-toolkit/blob/v4.8.2/docs/LAUNCHER.md) | [Desktop guide](https://github.com/jeremykenedy/fire-tv-toolkit/blob/v4.8.2/docs/DESKTOP.md) | [Compare 4.8.1 to 4.8.2](https://github.com/jeremykenedy/fire-tv-toolkit/compare/v4.8.1...v4.8.2)
