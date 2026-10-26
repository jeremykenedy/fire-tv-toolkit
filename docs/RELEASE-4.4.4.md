# Fire TV Toolkit 4.4.4

Fire TV UI updates can be checked from its public release without requiring a GitHub sign-in. The screensaver catalog now describes and previews Cloud Drift Clock 2.0's real filmed flight and Blue Meridian 1.0.1's detailed satellite Earth accurately.

## Upgrade guide

From a clean existing Toolkit checkout, run:

```sh
firetv-updates --self --install toolkit --yes
```

Alternatively, fast-forward that checkout to the verified primary branch, then run `npm ci` and `npm link`. Desktop users install the matching macOS, Windows or Linux package through their normal operating-system installer. Node 18 or newer remains required for the CLI; source desktop builds retain their Node 22.13 minimum. No configuration migration, TV reset or reboot is needed.

Existing Android apps keep their package, signing identity and settings. Update these scenes separately:

```sh
firetv-screensavers --install=cloud-drift-clock,blue-meridian --yes
```

Installation does not select a different screensaver or change its timers. The public UI check still verifies release checksum, package and version; its staged installer retains TV confirmation. Optional GitHub authentication can raise API limits.

## Breaking changes

None in the Toolkit public interface or runtime floors. Cloud Drift Clock 2.0 is a separate upstream visual change: its filmed scene supports seven effective controls; legacy palette and density values stay stored but do not affect footage. Its existing default clock visibility is retained. Blue Meridian keeps all seven native controls.

## Major changes

- Public Fire TV UI release lookup works without a required sign-in in CLI and desktop update paths.
- Cloud Drift Clock 2.0 and Blue Meridian 1.0.1 have current unretouched physical-TV gallery images, exact artifact contracts and preserved media attribution.

## Minor changes and fixes

- Document Black Screen Dream in both selection command lists.
- Align desktop version metadata with its bundled local Toolkit dependency.
- Refresh the current native macOS Live TV, update and About captures; label older device screenshots as historical evidence.

## Verification

The actual packaged macOS 4.4.4 app launched, displayed its current version and checked the published 4.4.3 release correctly. No TV was connected for that desktop capture and no installer was opened. Both screensaver releases were downloaded and verified against their published APK hashes and production signing certificates. Their native device evidence and compatibility limits are linked in the [screensaver guide](https://github.com/jeremykenedy/fire-tv-toolkit/blob/v4.4.4/docs/SCREENSAVERS.md).

CLI, desktop and native packaging checks are completed against the release source before publication. A build or installation does not establish owner acceptance of every screensaver's appearance. Native 4K, extended thermal behavior and every possible TV/app update confirmation path remain unverified.

## Security and data integrity

User-initiated update downloads retain verification and existing device/app data. This change adds no analytics or background update checks. Cloud media remains CC BY 3.0 independently of Toolkit's source license; NASA source attribution is retained.

## Rollback

Install the previous desktop release or use a clean checkout of `v4.4.3` for the CLI, followed by `npm ci` and `npm link`. This does not downgrade installed TV apps or erase their settings. Android blocks lower-version-code installs; do not uninstall an app merely to downgrade it without separately backing up its settings.

[Compare v4.4.3 to v4.4.4](https://github.com/jeremykenedy/fire-tv-toolkit/compare/v4.4.3...v4.4.4)
