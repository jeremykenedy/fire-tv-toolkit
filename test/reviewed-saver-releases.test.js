import test from 'node:test';
import assert from 'node:assert/strict';
import { SCREENSAVERS } from '../src/screensaver-registry.js';
import { publishedApk } from '../src/update-releases.js';

const releases = [
  {id: 'black-screen-dream', pkg: 'com.jeremykenedy.blackscreendream', dream: '.BlackScreenDreamService', tag: 'v1.0.1',
    bytes: 21234, sha256: '3281db249bcf776ffcd04e55213d86dcda0efc1626881c8895051602567da97c'},
  {id: 'hearth-presence', pkg: 'com.jeremykenedy.hearthpresence', dream: '.HearthDreamService',
    bytes: 121223466, sha256: '9541eb4fe2f4d7d69ac1f85b38144f5b5926274291ebec796d8150d27e07b781'},
  {id: 'prism-clock', pkg: 'com.jeremykenedy.prismclock', dream: '.PrismDreamService',
    bytes: 127947, sha256: '6d1a3204ca648033c3c0c1d68adcceb29e90ed1ff61ec24b7f65e1326b7621e8'},
];

for (const release of releases) {
  const entry = SCREENSAVERS.find((item) => item.id === release.id);
  test(`${entry.name} installs its reviewed public artifact without changing identity`, () => {
    assert.equal(entry.pkg, release.pkg);
    assert.equal(entry.dreamComponent, release.pkg + '/' + release.dream);
    assert.equal(entry.tag, release.tag ?? 'v1.1.0');
    assert.equal(entry.asset, release.id + '.apk');
    assert.equal(entry.bytes, release.bytes);
    assert.equal(entry.sha256, release.sha256);
  });

  test(`${entry.name} latest checks ignore the reviewed installation baseline`, async () => {
    let requestedTag = 'not called';
    const next = await publishedApk(entry, {
      latestRelease: async (repo, asset, tag) => {
        assert.equal(repo, entry.repo);
        assert.equal(asset, entry.asset);
        requestedTag = tag;
        return {
          tag: 'v1.2.0', asset, sha256: 'a'.repeat(64), bytes: 54321,
          apkUrl: `https://github.com/${repo}/releases/download/v1.2.0/${asset}`,
        };
      },
    });
    assert.equal(requestedTag, undefined);
    assert.equal(next.tag, 'v1.2.0');
    assert.equal(next.sha256, 'a'.repeat(64));
  });
}
