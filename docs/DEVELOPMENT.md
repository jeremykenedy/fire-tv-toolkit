# Development

## Tests

```bash
npm test            # every test
npm run coverage    # with line and branch coverage, written to lcov.info
```

The suite runs against a fake TV (`test/helpers/fake-adb.js`): a stand-in
`adb` put first on PATH that keeps the TV's settings and packages in a JSON
file. It also points adb at a server port nothing listens on, so a test can
never reach a real TV. Interactive flows are driven through piped input
(`test/helpers/drive.js`). Tests use a throwaway `.env` and screensaver folder,
set through test-only hooks, never through environment variables in the code.

Coverage is 100% of lines and branches. Keep it there: `npm run coverage` shows anything new that is not covered.

## Building Home Redirect

```bash
android/home-redirect/build.sh
```

Needs a JDK and the Android SDK build tools; no Gradle. The APK is signed with
a key kept outside the repo, and every release must use the same key or the
TV refuses the update. Bump `VERSION_CODE` and `VERSION_NAME` in `build.sh`
for each change.

## Releasing

1. Start from the current remote `main` and review the complete change range.
   Update the root and desktop package versions and both lockfiles together.
2. For a companion app refresh, verify its already published release, asset name,
   size, SHA-256, Android package/version/SDK metadata and production certificate.
   Update only the reviewed registry pin and its documentation. Fire TV UI also
   requires its matching published icon ZIP and checksum, with every catalog PNG
   verified. Do not point an installation pin at an unpublished release.
3. Run the CLI and desktop tests, desktop lint, and relevant download preparation
   checks. Build the desktop app, capture the current packaged About/update views
   using isolated sample data, and verify the README and gallery in a browser.
   Preserve existing local TV profiles and command routes.
4. Merge the reviewed changes to `main` and require the exact primary-head Tests,
   Desktop app and Pages workflows to pass. The desktop matrix builds and checks
   macOS Intel/Apple silicon, Windows x64 and Linux x64 packages. Record actual
   native/install/removal results and remaining signing limitations accurately.
5. Confirm the checked-out release commit is the current remote primary tip,
   create its matching semantic version tag, and verify that tag on the remote.
   Download the seven installers from the passing primary Desktop workflow,
   verify their identity/integrity, and create `SHA256SUMS` for those exact files.
6. Publish the release with the installers, checksum manifest and reviewed notes
   covering upgrade, breaking changes, major changes, fixes, verification and
   recovery. Update GitHub About, website and topics. Download the published
   assets anonymously and verify their sizes and hashes against the manifest.

Rebuild `android/home-redirect` only when that separate helper changes. Its
`HOME_REDIRECT_RELEASE` registry entry must name a published release containing
that APK; an ordinary Toolkit/UI catalog patch does not move that pin or rebuild
Home Redirect. Keep reviewed installation pins separate from latest-published
update checks.

## Project site

The [project site](https://jeremykenedy.github.io/fire-tv-toolkit/) is built from `README.md` and `docs/` by Jekyll (`_config.yml`) and deployed by `.github/workflows/pages.yml` on every push to `main`. Edit the Markdown; there is nothing else to update.

## Adding a screensaver

Add an entry to `src/screensaver-registry.js` after vetting it (see
[Screensavers](SCREENSAVERS.md)). Its releases need an APK and a published
SHA-256. Everything else, the menus, flags and revert options, follows from
the registry.

## Source layout

```text
fire-tv-toolkit/
├── android/home-redirect/   # The Home Redirect app: sends Home to AT4K or LTvLauncher, adds the Screensavers tile
├── art/                     # README banners
├── bin/                     # One entry point per command
├── desktop/                 # Cross-platform IPTV player, Fire TV tools and installers
├── docs/                    # Guides, references and screenshots
├── src/
│   ├── apply/               # The adb changes themselves
│   ├── steps/               # Each command's prompts and flags
│   ├── adb.js               # Talking to the TV
│   ├── iptv-registry.js     # fire-iptv, OwnTV and guide-matched starter sources
│   ├── launcher-registry.js # AT4K, LTvLauncher and Home Redirect, with their sources and checksums
│   └── screensaver-registry.js # The vetted screensavers
├── test/                    # Tests, with a fake TV so no real device is needed
├── setup.js                 # First-run setup on a fresh clone
└── .env.example             # Template for the saved settings
```

## Desktop download links

Desktop installer filenames omit the version so `/releases/latest/download/<filename>` always targets the newest published release. Keep the filenames from `desktop/package.json` when uploading installers. Attach `SHA256SUMS` for those exact files. The README graphic downloads the Apple silicon DMG; the platform table provides the other installers.
