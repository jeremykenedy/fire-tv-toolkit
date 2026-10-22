// Both players install from a pinned upstream release. fire-iptv includes
// its starter catalog; OwnTV accepts sources through its own setup screens.

export const FIRE_IPTV = {
  id: 'fire-iptv',
  name: 'fire-iptv',
  pkg: 'com.jeremykenedy.fireiptv',
  repo: 'jeremykenedy/fire-iptv',
  tag: 'v1.1.1',
  asset: 'fire-iptv.apk',
  sha256: '66605a6dd20a1e5039a1115542626a6027701dd800a0e2d991bcbcf86f7e0294',
};

/** OwnTV publishes no checksum with its releases, so this one is pinned by tag and hash. */
export const OWNTV = {
  id: 'owntv',
  name: 'OwnTV',
  pkg: 'tv.own.owntv',
  repo: 'ahXN00/OwnTV',
  tag: 'v5.2.1',
  asset: 'OwnTV-v5.2.1.apk',
  updateAssetTemplate: 'OwnTV-{tag}.apk',
  sha256: 'dbc991358d09b6e0e7a40683d63346528f9702efe4358c7f9ae66af266e4ee3c',
};

export const IPTV_APPS = [FIRE_IPTV, OWNTV];

/** Free live TV and international sports, with IDs matched to the guide feeds. */
export const IPTV_PLAYLIST = 'https://raw.githubusercontent.com/jeremykenedy/fire-iptv/main/playlists/owntv.m3u';
export const IPTV_GUIDES = [
  'https://i.mjh.nz/PlutoTV/us.xml.gz',
  'https://i.mjh.nz/SamsungTVPlus/us.xml.gz',
];
