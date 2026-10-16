// Both players install from a pinned upstream release. fire-iptv includes
// its starter catalog; OwnTV accepts sources through its own setup screens.

export const FIRE_IPTV = {
  id: 'fire-iptv',
  name: 'fire-iptv',
  pkg: 'com.jeremykenedy.fireiptv',
  repo: 'jeremykenedy/fire-iptv',
  tag: 'v1.0.0',
  asset: 'fire-iptv.apk',
  sha256: 'dc608e555b57dd20473f8f785bc831773912c030be16d73a95d98da9cd5e1cdc',
};

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

export const IPTV_APPS = [FIRE_IPTV, OWNTV];

/** Free live TV and international sports, with IDs matched to the guide feeds. */
export const IPTV_PLAYLIST = 'https://raw.githubusercontent.com/jeremykenedy/fire-iptv/main/playlists/owntv.m3u';
export const IPTV_GUIDES = [
  'https://i.mjh.nz/PlutoTV/us.xml.gz',
  'https://i.mjh.nz/SamsungTVPlus/us.xml.gz',
];
