# Fire TV Toolkit 4.7.0

Refresh the reviewed Fire TV UI installation baseline and companion icons,
prevent stale desktop update choices after a failed recheck, and retain essential
builds and tests while third-party analysis services are deferred.

## Upgrade guide

Desktop users on 4.6.0 and earlier 4.x releases can install the matching 4.7.0
package for their OS and architecture. Quit the previous desktop app before
replacing it. Keep the existing application data directory: named TV profiles,
Live TV favorites, saved settings and device restoration baselines are retained.
No database migration, account change or TV reboot is required.

CLI users with a clean primary-branch source installation can update with:

```sh
firetv-updates --self --install toolkit --yes
```

Alternatively, fast-forward a clean checkout of verified `main`, run `npm ci`,
and refresh `npm link`. Preserve `.env`, local custom files and saved restoration
baselines. Explicit CLI `--ip` values do not replace the saved default address.
For older 3.x source checkouts, retain local configuration before following this
same clean-checkout path; review the 4.6.0 guide before using desktop TV profiles.

Check the active named TV and connect before applying a change. UI installation
keeps the current Home choice. Choose Use explicitly to change Home. The verified
matching icon archive fills missing shared icons and retains custom images.
Installed UI updates continue to use their protected on-TV confirmation flow.

## Breaking changes

None. CLI Node 18+ and desktop-source Node 22.13+ minimums are unchanged.
Existing launcher and screensaver defaults, named profiles, custom files, saved
settings and update verification remain. Fire TV UI Home routing still requires
at least its preservation API in code 69.

## Major changes

The reviewed UI installation baseline and matching icon archive advance together.
Both public assets are checked by byte count and SHA-256 before registration;
Android package/version identity is also verified. Latest-published update checks
remain independent of reviewed installation pins.

GitGuardian, SonarCloud, Codacy, CodeFactor and Aikido are deferred. Their Toolkit
workflows, configuration and badges are removed where present. Essential CLI and
desktop tests, desktop lint, packaging and native checks remain in place.

## Minor changes and fixes

- A failed published-app recheck clears the previous checked choices before any
  replacement check starts. Retry Check for updates after a failure.
- Lossless raster optimizations retain decoded pixels and image dimensions.
  Existing SVG banners and their content-hashed filenames are preserved.

## Security and data integrity

No new runtime dependency, telemetry, account or TV permission is introduced.
Published update APK hashes, package identity, newer Android version codes,
matching icon verification and Android signer enforcement remain required.
Existing app data is retained by replacement installs.

## Verification and known limits

All 501 CLI tests and 56 desktop unit tests pass, along with desktop lint.
The native packaged macOS smoke test passes on Electron 44.9.3. Verified public
UI/icon hashes are recorded in the release evidence. Fresh native macOS, Windows and Linux captures show this version using isolated
sample TV data and synthetic HLS media. All three desktop CI jobs pass packaged
installation/playback/profile checks; Windows/Linux removal also passes. No
physical TV is contacted by the desktop package checks.

Publication requires the final public UI pin, final primary-branch checks,
verified installer artifacts and matching semantic version tag. The final UI pin must receive its relevant checks before publication. Packages remain unsigned; this
release does not resolve macOS Gatekeeper's unsigned application limitation.
No new physical TV behavior or owner visual acceptance is established here.

## Rollback and recovery

Keep a copy of the desktop application data directory and any source configuration
before replacement. Reinstall the previous verified desktop package if needed;
this release introduces no new profile schema or migration. Do not clear TV
restoration baselines to recover an installer failure. Prefer a newer verified
corrective release if an application update fails. No TV reset is required.

[Desktop guide](https://github.com/jeremykenedy/fire-tv-toolkit/blob/v4.7.0/docs/DESKTOP.md),
[Home guide](https://github.com/jeremykenedy/fire-tv-toolkit/blob/v4.7.0/docs/LAUNCHER.md),
[compare v4.6.0 to v4.7.0](https://github.com/jeremykenedy/fire-tv-toolkit/compare/v4.6.0...v4.7.0).
