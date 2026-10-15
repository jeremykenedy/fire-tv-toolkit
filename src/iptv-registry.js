// OwnTV and the iptv-org playlist it is pointed at. OwnTV only takes a
// playlist through its own setup screens, so this tool installs and opens it
// and shows the playlist URL to add; it never writes anything into the app.

/** OwnTV publishes no checksum with its releases, so this one is pinned by tag and hash. */
export const OWNTV = {
  id: 'owntv',
  name: 'OwnTV',
  pkg: 'tv.own.owntv',
  repo: 'ahXN00/OwnTV',
  tag: 'v5.1.0',
  asset: 'OwnTV-v5.1.0.apk',
  sha256: '39a81165fafc1eec24bbd9d5d2769e54de24441a5de20993550170abad22c295',
};

/** iptv-org's playlist of publicly available United States channels. */
export const IPTV_PLAYLIST = 'https://iptv-org.github.io/iptv/countries/us.m3u';
