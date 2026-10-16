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

1. Bump `version` in `package.json`.
2. Build Home Redirect and note its SHA-256.
3. Tag `v<version>`, publish the release, attach `firetv-home-redirect.apk`,
   and add `SHA-256 (firetv-home-redirect.apk): <hash>` to the notes.
4. The tool installs Home Redirect from the release named in
   `HOME_REDIRECT_RELEASE` in `src/launcher-registry.js`. Set it to the new tag
   once that release has the APK attached, so the code never points at a
   release that does not exist yet.

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
