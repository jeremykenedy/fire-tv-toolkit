# TV guide, sports and provider libraries

The toolkit offers two Fire TV players. **fire-iptv** prepares public live TV
and guide feeds automatically. **OwnTV** is available for people who prefer its
interface or already use it. Both install from pinned releases with verified
SHA-256 checksums, preserving existing app data during an update.

## Install fire-iptv

```bash
fire-iptv --install
```

Or choose **Install fire-iptv** in the desktop app's Home screen. On first
launch, Discover offers TV guide, All sports, search and Add provider. The
October 16, 2026 snapshot has 1,323 live channels, including 226 sports channels.
Availability varies by region and channel. Approximately 299 channels have IDs
matched to the included Pluto TV and Samsung TV Plus guides. Guide data loads
in the background, and managed sources refresh every six hours.

Movies and Series require an M3U or Xtream provider that includes on-demand
content. The provider supplies titles, artwork, genres and seasons. The starter
contains no old public-domain movie collection. Tubi and Plex shortcuts open
those separate applications and their catalogs.

[fire-iptv source and configuration](https://github.com/jeremykenedy/fire-iptv)
explain the catalog, offline setup, profiles and release signing.

## Configure OwnTV

```bash
firetv-iptv --app=owntv --install
```

1. In OwnTV, open **Settings > Sources & guide > Playlists > Add Source > Remote**.
2. Open the address shown on the TV from a phone on the same Wi-Fi and enter
   the displayed PIN.
3. Choose M3U / M3U8 and enter this playlist URL:

   ```text
   https://raw.githubusercontent.com/jeremykenedy/fire-iptv/main/playlists/owntv.m3u
   ```

4. Send to TV, select a six-hour refresh and choose Start Import. Set the source
   as the default.
5. Under **EPG Sources**, add both URLs below, select a six-hour refresh and sync.

   ```text
   https://i.mjh.nz/PlutoTV/us.xml.gz
   https://i.mjh.nz/SamsungTVPlus/us.xml.gz
   ```

Use **TV Guide** for the timeline. OwnTV Home uses recent and favorite channels.
Add your movie/series provider separately in OwnTV; the players do not share
private credentials or libraries.

[iptv-org](https://github.com/iptv-org/iptv) is a public live-channel directory,
not a movie or series service. Its [worldwide playlist](https://iptv-org.github.io/iptv/index.m3u)
is also available if you want broader live coverage, with less matched guide
data. Neither this toolkit nor fire-iptv hosts video.

## Commands

| Command | Behavior |
| --- | --- |
| `fire-iptv --install` | Install/update fire-iptv and open it |
| `fire-iptv --uninstall` | Remove fire-iptv and its private library |
| `firetv-iptv` | Choose a player in the guided menu |
| `firetv-iptv --app=fire-iptv --install` | Explicit fire-iptv installation |
| `firetv-iptv --app=owntv --install` | Explicit OwnTV installation |
| `firetv-iptv --install` | Legacy OwnTV installation |
| `firetv-iptv --uninstall` | Legacy OwnTV removal |

## Sources and removal

fire-iptv is a GPL-3.0 fork of OpenIPTV. OwnTV remains unmodified from
[ahXN00/OwnTV](https://github.com/ahXN00/OwnTV) v5.1.0, requiring Android 8 or
newer. fire-iptv requires Android 7 / API 24 or newer. Both APKs include 32-bit
and 64-bit ARM code. Versions, assets and checksums are in `src/iptv-registry.js`.

Removing either app deletes its private library. `firetv-revert` leaves both
unchecked, and `firetv-revert --all` preserves both. Choose a player explicitly
to remove it. Back up inside the player first if you need its data later.
