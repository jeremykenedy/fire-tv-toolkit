# Fire TV Toolkit 4.5.1

Refresh the reviewed installation baselines and real native previews for the
existing Hearth Presence and Prism Clock entries. The CLI, desktop runtime,
other catalog entries and selected defaults are unchanged.

## Upgrade guide

Update an existing clean main-branch CLI installation using:

```sh
firetv-updates --self --install toolkit --yes
```

A source checkout can instead fast-forward to the verified primary branch,
then run `npm ci` and `npm link`. Desktop users install the matching macOS,
Windows or Linux package using the normal operating-system installer. CLI
Node 18+ and desktop-source Node 22.13+ requirements are unchanged. No TV app,
selected screensaver, timer, account or device permission is changed merely by
updating Toolkit.

Check the installed apps on an explicitly selected TV:

```sh
firetv-updates --ip YOUR_TV_IP --check
firetv-updates --ip YOUR_TV_IP --install hearth-presence --yes
firetv-updates --ip YOUR_TV_IP --install prism-clock --yes
```

These existing update commands verify current published metadata and the APK
before a replacement install. Same-package, same-signer updates retain app
preferences. Android can reject lower version codes; do not uninstall or clear
app data to work around a mismatch. Choosing a different screensaver is separate
and provides a reversible fallback.

Hearth 1.1 uses the existing flame-size setting for Small/Medium/Large wood
emission above fixed logs. Medium keeps the original recording. Traditional gas
height remains unsupported; the modern linear scene is the existing composite,
not newly filmed gas. Prism's Show clock switch is independent of randomization
and defaults On, preserving existing behavior until explicitly turned Off.

## Breaking changes

None. App identities, production signers, selected defaults, other registry
entries, saved TV configuration and update routing remain unchanged. Reviewed
installation pins do not override the updater's latest-published-release lookup.

## Major changes

No new host runtime feature. Existing entries now identify the verified app
releases and their current native output.

## Minor changes and fixes

- Record Hearth 1.1.0/code 7 and Prism 1.1.0/code 4 installation baselines and exact
  public artifact checksums.
- Refresh their native screenshots, responsive gallery derivatives and capture
  provenance, preserving required media notices.
- Document Hearth's eleven retained settings and Prism's twelve-row schema,
  including nonrandom Show clock.
- Keep the desktop package's bundled CLI dependency aligned with 4.5.1.

## Verification and limits

Local validation passed 455 CLI tests, 38 desktop tests and desktop lint. The
local macOS ARM package contains CLI 4.5.1 and both exact reviewed pins. Native
Windows and Linux installed-package tests passed, including HLS lifecycle,
setup, About, retained favorites and removal. The matching macOS CI job builds
both architectures and runs the packaged app check. Current Windows captures
were opened and inspected; source screenshot provenance records exact hashes.
The on-TV API 34 host gate also opened both apps' native settings and previews,
verified Prism clock On/Off and restored all surrounding state.
Prism retains the original renderer; its physical API 28 default measured about
17–18 presents per second, so this is not a GPU improvement. No claim is made
for new filmed linear gas, audible crackle quality, owner-wide visual acceptance
or thermal durability. An app preview is not natural idle
Dream activation, and compositor presents are not decoded-video FPS.

## Rollback

Reinstall desktop 4.5.0 or use a clean CLI checkout of `v4.5.0`, followed by
`npm ci` and `npm link`. This does not downgrade or remove TV apps, erase local
configuration or reset accounts. Keep existing TV settings while using a newer
signed corrective app update if an Android regression needs repair.

[Catalog guide](https://github.com/jeremykenedy/fire-tv-toolkit/blob/v4.5.1/docs/SCREENSAVERS.md),
[gallery](https://github.com/jeremykenedy/fire-tv-toolkit/blob/v4.5.1/docs/SCREENSHOTS.md),
[compare v4.5.0 to v4.5.1](https://github.com/jeremykenedy/fire-tv-toolkit/compare/v4.5.0...v4.5.1).
