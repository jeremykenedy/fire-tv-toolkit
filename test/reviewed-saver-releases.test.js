import test from 'node:test';
import assert from 'node:assert/strict';
import { SCREENSAVERS } from '../src/screensaver-registry.js';
import { publishedApk } from '../src/update-releases.js';

const hearth = SCREENSAVERS.find((entry) => entry.id === 'hearth-presence');

test('Hearth installation uses the reviewed public artifact without changing its identity', () => {
  assert.equal(hearth.pkg, 'com.jeremykenedy.hearthpresence');
  assert.equal(hearth.dreamComponent, hearth.pkg + '/.HearthDreamService');
  assert.equal(hearth.tag, 'v1.1.0');
  assert.equal(hearth.asset, 'hearth-presence.apk');
  assert.equal(hearth.bytes, 121223466);
  assert.equal(hearth.sha256, '9541eb4fe2f4d7d69ac1f85b38144f5b5926274291ebec796d8150d27e07b781');
});

test('a reviewed installation baseline does not hide newer published Hearth updates', async () => {
  let requestedTag = 'not called';
  const next = await publishedApk(hearth, {
    latestRelease: async (repo, asset, tag) => {
      assert.equal(repo, hearth.repo);
      assert.equal(asset, hearth.asset);
      requestedTag = tag;
      return {
        tag: 'v1.2.0', asset, sha256: 'a'.repeat(64), bytes: 54321,
        apkUrl: 'https://github.com/jeremykenedy/hearth-presence/releases/download/v1.2.0/hearth-presence.apk',
      };
    },
  });
  assert.equal(requestedTag, undefined);
  assert.equal(next.tag, 'v1.2.0');
  assert.equal(next.sha256, 'a'.repeat(64));
});
