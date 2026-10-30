# Home screen

**Fire TV UI** is the recommended launcher. AT4K, LTvLauncher and the Amazon
menu remain available. Recommendation affects menu order only: updating Toolkit
or installing a launcher does not automatically select a different Home screen.

## How it works

Fire TV UI uses its own DUMP-protected `BackupReceiver` and `HomeControl` API.
Selecting it enables its `Hra` and `HomeRedirectService` accessibility services,
removes the conflicting legacy redirect and AT4K Home service, and preserves all
other services. It does not install Toolkit's separate Home Redirect app.
A switch first changes only the narrow Home preference, then writes and verifies
the route. Only after successful readback does explicit Use commit through
`home-on` or `home-off`, so a failed route does not normalize private startup
flags. `ProtectionService` cannot repair a stale Home preference during the switch.
The protection service itself, screensaver selection, timers and unrelated
preferences are left alone. No microphone or notification access is granted.

UI installation grants only `WRITE_SECURE_SETTINGS`, required by that supported
HomeControl interface. For an existing installation it never calls HomeControl or rewrites private
Home/startup preferences; it restores the exact accessibility services/enabled
settings after the in-place APK update. Fresh installation uses preference-off
without selecting Home. An already-disabled UI remains disabled during an
update; choose Use when you want to enable it and change Home. Explicit Home switching validates readback before pressing Home; failed
readback restores the previous routing preference, including absence, and the
exact settings. The full code 69 HomeControl transaction must restore all four
private Home flags on native failure before Toolkit restores the earlier preference. A restore failure
is reported rather than claimed as successful. Mocked checks cover these paths;
this new Toolkit integration still needs a separately authorized physical gate.

UI installation also verifies the matching release's icon ZIP and SHA-256
sidecar before writing to the TV. It copies the catalog's 32 full HD PNGs to
`/sdcard/Pictures/Icons`, scans them and, on Android 10 or newer, publishes their
MediaStore rows so the native image picker can see them. Other pictures are
retained. The checked UI update flow sends the matching icons before staging
the APK for confirmation on the TV; it still does not install a UI update
silently or change Home preferences and grants. An incomplete icon transfer or
indexing result is reported as a failure.

The production copy/index helper passed a focused API 34 emulator gate with all
32 canonical images initially absent. It copied the exact reviewed PNG bytes;
Android reported every row visible with `is_pending=0`, `image/png` and native
1920x1080 dimensions. Existing pictures, all 34 APK hashes, the stopped UI's
identity, grants, appops, external files and recorded OS choices stayed intact.
The UI was not opened and no fresh private preference export was taken; its
fourteen-key state references the prior verified UI 70 checkpoint. This is native
file/index evidence, not an image-picker, physical Home or hardware-remote test.

For AT4K and LTvLauncher, Fire OS has no setting for choosing a Home app, so the
toolkit uses its legacy helper:

- **Home Redirect** (`com.jeremykenedy.firetv.homeredirect`), built from
  [`android/home-redirect`](../android/home-redirect) in this repo. It watches
  for the Amazon home screen coming to the front and opens the chosen launcher
  over it. It is told which app is in front, never what is on the screen, and
  it keeps and sends nothing. When the Amazon home screen appears straight
  after the launcher or Settings, it waits briefly, so the launcher's Settings
  gear still works. It opens AT4K unless told to open LTvLauncher.
- **AT4K's own service** (`com.overdevs.at4k/.Hra`), part of AT4K, runs beside
  it while Home goes to AT4K. It is switched off while Home goes to
  LTvLauncher, so it cannot pull Home back to AT4K, and switched on again when
  Home goes back to AT4K. Switching never changes AT4K itself or its settings.

LTvLauncher ships a "Home Button Fix" accessibility service that listens for
the Home key. Since Fire OS keeps that key from accessibility services, the
toolkit leaves it off and uses Home Redirect instead.

## The on-TV screensaver picker

Home Redirect also adds a **Screensavers** tile to the TV. It lists every
screensaver installed on the TV and makes the one you pick active, from the
couch. Fire OS Settings only offers Amazon's own. The picker needs the
`WRITE_SECURE_SETTINGS` permission, which the install grants over adb.

## LTvLauncher notifications

LTvLauncher can show notifications from other apps, but Android TV has no
settings screen for allowing that, so LTvLauncher asks for it over adb.
`launcher --install-ltv` grants it right after installing, and
`firetv-ltv-notifications` turns it on or off at any time. `firetv-revert`
turns it off.

## LTvLauncher backups

LTvLauncher's **Settings > Backup & Restore > Export Backup** saves a backup
in its own folder, which adb cannot read on Fire OS, and also copies it to the
TV's Download folder. `firetv-ltv-backup` copies one of those to this
computer. Export the backup in LTvLauncher first, since nothing outside the app
can start an export.

Restoring stays in LTvLauncher's **Import Backup**. It only lists backups it
exported itself, so a file copied back to the TV from a computer does not
show up there.

## Commands

```bash
launcher                    # guided menu, Fire TV UI recommended first
launcher --install-ui       # install/update Fire TV UI, keep the current Home choice
launcher --use=fire-tv-ui    # explicitly select Fire TV UI
launcher --install          # install or update AT4K and Home Redirect
launcher --install-ltv      # install or update LTvLauncher and Home Redirect
launcher --use=at4k         # Home goes to AT4K
launcher --use=ltv          # Home goes to LTvLauncher
launcher --use=amazon       # Home goes back to the Amazon menu
firetv-ltv-notifications --yes   # let LTvLauncher read notifications
firetv-ltv-notifications --off   # stop it
firetv-ltv-backup --pull=ltv-backup.json   # copy the newest LTvLauncher backup here
```

## Where the apps come from

- **Fire TV UI** comes from its own signed public release
  ([jeremykenedy/fire-tv-ui](https://github.com/jeremykenedy/fire-tv-ui)).
  The reviewed installation baseline is pinned in `src/launcher-registry.js`;
  the update catalog still checks the latest published release and stages an
  existing UI update through its supported updater, without duplicate rows.

- **AT4K** is installed from its author's own release
  ([avadhesh18/at4k](https://github.com/avadhesh18/at4k), v1.2), unmodified, and
  checked against a SHA-256 pinned in `src/launcher-registry.js`.
- **LTvLauncher** is installed from its authors' own release
  ([leanbitlab-org/LtvLauncher](https://github.com/leanbitlab-org/LtvLauncher),
  v2026.10.03, GPL-3.0), unmodified. Its releases publish no checksum, so the
  universal APK, which runs on 32 and 64-bit Fire TVs, is pinned by tag and
  SHA-256 in `src/launcher-registry.js`. It has no internet permission.
- **Home Redirect** is attached to this tool's release of the same version,
  with its SHA-256 in the release notes. Opening LTvLauncher needs Home
  Redirect 1.2.5 or newer; `launcher --install-ltv` updates it.

## Things to know

- If a different build of AT4K is already on the TV, signed by someone else,
  Android will not replace it. The install reports that and leaves your copy
  exactly as it is; switching the Home button still works with it.
- Installing or switching to LTvLauncher never installs, updates or removes
  AT4K.
- Updating Home Redirect in place can make Android drop it from the enabled
  accessibility services, which sends Home back to the Amazon menu. The
  install checks for this and switches Home back to the launcher it was on.
- `firetv-revert` and `uninstall` can send Home back to the Amazon menu and
  remove the apps. AT4K and LTvLauncher hold your home screen layout, which
  uninstalling deletes, so they start unticked and `firetv-revert --all` leaves
  them installed. Tick them to remove them.

## Integration contract

- `HOME_LAUNCHERS[0]` is Fire TV UI, with `recommended: true`.
- `launcherApps('fire-tv-ui')` returns only the UI entry. Desktop readiness must
  inspect that list instead of requiring the legacy Home Redirect globally.
- `launcherState().uiHomeSupported` is exposed when UI is installed and is true
  only for version code 69 or newer. Desktop must disable unsupported Home changes
  without changing an existing active launcher.
- `launcherState().home` includes `fire-tv-ui` only when both own services are
  enabled and `accessibility_enabled=1`. Existing AT4K/LTvLauncher/Amazon choices
  keep their original identifiers.
- CLI accepts `--install-ui` and `--use=fire-tv-ui`; `--install` remains AT4K.
- `UI_UPDATE` derives shared identity from the registry but resolves latest
  published metadata. Installed UI updates keep their staged-update path.
- No new native or physical behavior has been proved by these mocked tests.

### Verified UI update and Home preference contract

The reviewed installation pin is public [Fire TV UI 1.16.0/code 77](https://github.com/jeremykenedy/fire-tv-ui/releases/tag/v1.16.0):
`fire-tv-ui-1.16.0.apk`, 17,138,328 bytes, SHA-256
`171f16f9b4777d59cd26906b3f6684ef72c3b4586e0af090b32be69f9980f487`.
Its production certificate is
`9a6416b9dc3c996d591b185d600b8ab76e1c7b01846db8d6063b399caf7b5a11`;
Android minimum 27 and target 36 are unchanged. Both public APK/icon assets and
their checksum files were downloaded anonymously and matched their exact frozen
identities. Actual Toolkit `downloadApk` and `prepareUiIcons` helpers also passed.
The paired `fire-tv-ui-icons-1.16.0.zip` is 8,505,979 bytes with SHA-256
`161660ecad562d6813734ce922e44a08d554262a72b8144c5f0734cc1701f8c7`.
All 32 PNGs remain Full HD. The APK manifest reports package
`com.jeremykenedy.firetv.ui`, version 1.16.0 and version code 77.

All Home mutations involving Fire TV UI require code 69 or newer. Unknown or
older installed codes are refused before a preference or OS write, and the
desktop disables Home changes until the UI is updated. An installation
descriptor must also declare at least code 69. Existing UI updates issue no Home
operation and retain private choices and grants; fresh Toolkit installation
starts with the UI Home preference Off until you choose Use.

The historical code 69 UI passed an actual public 68-to-69 replacement on the TV
emulator. This established the narrow Home API below; it is not a new native
result for every later installation pin. Enabled=true, startup=false, detection=false and an absent override key
survived before Main initialized. Both native Home services rebound. The
protected API reports exactly `home-preference=unset|on|off`; preference-on/off
change only the enabled key and preference-clear restores its absence. Actual
permission-denied full Home operations restored all four prior values and key
presence, with OS accessibility unchanged. The temporary permission and fixture
were removed and the complete baseline restored. These are emulator functional
results, not new physical Fire OS Home or hardware-remote claims.

Toolkit sets the narrow preference before its OS route change so the native
guard cannot repair the old route. It verifies readback before applying the
ordinary full Home-on/off choices. A failed Use restores the exact enabled
preference, including absence, and the original raw OS accessibility values;
it does not export a broad private profile. An ordinary first Main launch still
initializes missing defaults. Code 68's receiver and preference operations could
normalize choices, so this contract must not be claimed for that version.
