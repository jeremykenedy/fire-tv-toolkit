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
without selecting Home. Explicit Home switching validates readback before pressing Home; failed
readback restores the previous routing preference, including absence, and the
exact settings. The full code69 HomeControl transaction must restore all four
private Home flags on native failure before Toolkit restores the earlier preference. A restore failure
is reported rather than claimed as successful. Mocked checks cover these paths;
this new Toolkit integration still needs a separately authorized physical gate.

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
  only for version code69 or newer. Desktop must disable unsupported Home changes
  without changing an existing active launcher.
- `launcherState().home` includes `fire-tv-ui` only when both own services are
  enabled and `accessibility_enabled=1`. Existing AT4K/LTvLauncher/Amazon choices
  keep their original identifiers.
- CLI accepts `--install-ui` and `--use=fire-tv-ui`; `--install` remains AT4K.
- `UI_UPDATE` derives shared identity from the registry but resolves latest
  published metadata. Installed UI updates keep their staged-update path.
- No new native or physical behavior has been proved by these mocked tests.

### Pending native update-preservation gate

All Home mutations involving the native UI require version code69 or newer.
Unknown and older installed codes are refused before a preference or OS write.
A pinned installation descriptor must also declare code69 or newer; the current
public68 baseline is intentionally unavailable for fresh installation until its
reviewed successor is pinned.

The reviewed public UI68 receiver handles its own package replacement by calling
HomeControl, which can normalize its four Home/startup flags independently of
Toolkit. The mocked Toolkit update fixture deliberately proves that Toolkit
issues no Home operation for an existing install and retains nonstandard flag
combinations; it does not prove that upstream receiver behavior is fixed.
Before releasing this integration, the UI release must rebind after an update
without rewriting those private choices, and its exact signed APK must pass a
native upgrade/preservation gate. Explicit `--use=fire-tv-ui` remains a separate
user action that uses HomeControl's supported Home-on behavior.

The code69 protected API reads only `home-preference-state`, returning exactly
`home-preference=unset|on|off`. Preference-on/off change only
`fire_tv_ui_home_enabled`; preference-clear restores its absence. They must
preserve the other three Home flags and their presence. A failed explicit Use
restores that exact preference and raw OS settings; it does not use a broad
preference export. The full Home-on/off commit occurs only after route readback
and requires native four-key rollback on error. These contracts remain subject
to verification against the final signed code69 APK.
