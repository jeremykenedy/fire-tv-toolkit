# Free live TV

`firetv-iptv` installs OwnTV, a free, open source IPTV player for Android TV,
opens it on the TV, and shows the [iptv-org](https://github.com/iptv-org/iptv)
playlist of publicly available United States channels to add to it.

## Adding the channels

OwnTV only takes a playlist through its own screens, so the toolkit shows the
URL instead of writing it into the app. After the install, OwnTV is open on
the TV:

1. Go through its first screens, which ask for a profile name, to **Add a
   playlist** and choose **Remote**. Later on it is under **Settings > Sources &
   guide > Playlists > Add Source > Remote**.
2. Open the address the TV shows in a browser on any device on the same Wi-Fi,
   or scan its QR code with a phone, and enter the PIN from the TV.
3. Choose **M3U / M3U8** and paste:

   ```text
   https://iptv-org.github.io/iptv/countries/us.m3u
   ```

4. Press **Send to TV**, then **Start Import** on the TV. OwnTV lists about
   1,500 channels under **Live TV**.

iptv-org also publishes playlists for every other country, category and
language in its [PLAYLISTS.md](https://github.com/iptv-org/iptv/blob/master/PLAYLISTS.md).
Any of them can be added the same way. The channels are links to publicly
available streams collected by iptv-org; neither iptv-org nor this tool hosts
any video.

## Commands

```bash
firetv-iptv                 # guided menu
firetv-iptv --install       # install or update OwnTV, open it and show the playlist
firetv-iptv --uninstall     # remove OwnTV and the playlists saved in it
```

## Where OwnTV comes from

OwnTV is installed unmodified from its author's own release
([ahXN00/OwnTV](https://github.com/ahXN00/OwnTV), v5.1.0, GPL-3.0). Its
releases publish no checksum, so the tag and the SHA-256 of `OwnTV-v5.1.0.apk`
are pinned in `src/iptv-registry.js` and the download is refused if it does
not match. The APK carries 32 and 64-bit ARM builds and needs Android 8 or
newer.

## Removing it

`firetv-iptv --uninstall` removes OwnTV. `firetv-revert` offers it too, but
unchecked, because removing OwnTV deletes the playlists added in it, and
`firetv-revert --all` leaves it installed.
