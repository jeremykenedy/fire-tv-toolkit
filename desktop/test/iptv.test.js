import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  buildChannels,
  filterChannels,
  createIptvCatalog,
  streamUrl,
} from '../iptv.js';
import {
  configurePlayerNetwork,
  playerRequestHeaders,
} from '../player-network.js';

function fixture() {
  return {
    channels: [
      {
        id: 'News.us',
        name: 'World News',
        country: 'US',
        categories: ['news'],
      },
      {
        id: 'Cinema.fr',
        name: 'Cinema',
        country: 'FR',
        categories: ['movies'],
      },
    ],
    feeds: [
      { channel: 'News.us', id: 'Main', languages: ['eng'] },
      { channel: 'Cinema.fr', id: 'Main', languages: ['fra'] },
    ],
    streams: [
      {
        channel: 'News.us',
        feed: 'Main',
        title: 'News HD',
        url: 'https://tv.example/news.m3u8',
        quality: '720p',
      },
      {
        channel: 'News.us',
        feed: 'Main',
        title: 'News backup',
        url: 'https://tv.example/backup.m3u8',
      },
      {
        channel: 'News.us',
        feed: 'Main',
        title: 'News duplicate',
        url: 'https://tv.example/news.m3u8',
        quality: '720p',
      },
      {
        channel: 'Cinema.fr',
        feed: 'Main',
        url: 'https://tv.example/cinema.m3u8',
      },
      { title: 'Independent TV', url: 'http://tv.example/independent.m3u8' },
      { title: 'Unsafe', url: 'file:///etc/passwd' },
    ],
  };
}

test('the catalog includes worldwide channels and unlisted streams, grouping duplicate sources', () => {
  const channels = buildChannels(fixture());
  assert.equal(channels.length, 3);
  const news = channels.find((entry) => entry.id === 'News.us@Main');
  assert.equal(news.sources.length, 2);
  assert.deepEqual(news.languages, ['eng']);
  assert.equal(filterChannels(channels).total, 3);
  assert.equal(
    filterChannels(channels, { country: 'FR' }).channels[0].name,
    'Cinema',
  );
  assert.equal(
    filterChannels(channels, {
      language: 'eng',
      category: 'news',
      search: 'backup',
    }).total,
    1,
  );
  assert.equal(
    filterChannels(channels, { favorites: true }, ['Cinema.fr@Main']).total,
    1,
  );
});

test('channel paging preserves all results without exposing stream URLs in search results', () => {
  const channels = Array.from({ length: 215 }, (_, index) => ({
    ...buildChannels(fixture())[0],
    id: `channel${index}`,
  }));
  const page = filterChannels(channels, { offset: 200 });
  assert.equal(page.total, 215);
  assert.equal(page.channels.length, 15);
  assert.equal('url' in page.channels[0].sources[0], false);
  assert.throws(
    () => filterChannels(channels, { offset: -1 }),
    /valid channel filters/,
  );
  assert.throws(
    () => filterChannels(channels, { search: {} }),
    /valid channel filters/,
  );
});

test('language feeds on one channel stay separate and have clear names', () => {
  const input = fixture();
  input.feeds.push({
    channel: 'News.us',
    id: 'Spanish',
    name: 'Spanish',
    languages: ['spa'],
    is_main: false,
  });
  input.streams.push({
    channel: 'News.us',
    feed: 'Spanish',
    title: 'News Spanish',
    url: 'https://tv.example/es.m3u8',
  });
  const channels = buildChannels(input);
  const spanish = filterChannels(channels, { language: 'spa' });
  assert.equal(spanish.total, 1);
  assert.equal(spanish.channels[0].name, 'World News / Spanish');
  assert.equal(spanish.channels[0].sources.length, 1);
  assert.equal(
    filterChannels(channels, { language: 'eng' }).channels[0].sources.length,
    2,
  );
});

test('stream URLs reject local destinations, credentials and executable protocols', () => {
  for (const url of [
    'file:///tmp/a',
    'javascript:alert(1)',
    'http://localhost/a',
    'http://127.0.0.1/a',
    'http://10.0.0.1/a',
    'http://192.168.1.1/a',
    'http://172.16.0.1/a',
    'http://169.254.1.1/a',
    'http://user:pass@tv.example/a',
    'not a URL',
  ])
    assert.equal(streamUrl(url), null, url);
  assert.equal(
    streamUrl('https://tv.example/live.m3u8'),
    'https://tv.example/live.m3u8',
  );
  assert.equal(
    streamUrl('http://tv.example/live.m3u8'),
    'http://tv.example/live.m3u8',
  );
});

test('the catalog caches downloads, saves favorites and keeps a working cache during an outage', async (t) => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'firetv-iptv-'));
  t.after(() => fs.rmSync(dataDir, { recursive: true, force: true }));
  let calls = 0;
  let offline = false;
  let clock = 1000;
  const fetchImpl = async (url) => {
    calls++;
    if (offline) throw new Error('Network unavailable');
    return {
      ok: true,
      json: async () =>
        fixture()[new URL(url).pathname.split('/').at(-1).replace('.json', '')],
    };
  };
  const catalog = createIptvCatalog({ dataDir, fetchImpl, now: () => clock });
  assert.equal((await catalog.query()).catalogTotal, 3);
  await catalog.query({ country: 'FR' });
  assert.equal(calls, 3);
  await catalog.favorite('Cinema.fr@Main', true);
  const restarted = createIptvCatalog({ dataDir, fetchImpl, now: () => clock });
  assert.equal(
    (await restarted.query({ favorites: true })).channels[0].id,
    'Cinema.fr@Main',
  );
  const source = (await catalog.query({ search: 'World News' })).channels[0];
  assert.equal(
    (await catalog.source(source.id, source.sources[0].id)).url,
    'https://tv.example/news.m3u8',
  );
  await assert.rejects(
    catalog.source('arbitrary', 'https://localhost/'),
    /no longer/,
  );
  await assert.rejects(catalog.favorite('arbitrary', true), /Choose a channel/);
  offline = true;
  clock += 24 * 60 * 60 * 1000;
  const cached = await catalog.query({}, true);
  assert.equal(cached.cached, true);
  assert.equal(cached.total, 3);
});

test('an initial catalog outage reports a failure rather than an empty success', async (t) => {
  const dataDir = fs.mkdtempSync(
    path.join(os.tmpdir(), 'firetv-iptv-failure-'),
  );
  t.after(() => fs.rmSync(dataDir, { recursive: true, force: true }));
  const catalog = createIptvCatalog({
    dataDir,
    fetchImpl: async () => ({ ok: false, status: 503 }),
  });
  await assert.rejects(catalog.query(), /HTTP 503/);
});

test('playback networking applies only to local player media requests and strips credentials', () => {
  const hooks = {};
  const webRequest = Object.fromEntries(
    ['onBeforeRequest', 'onBeforeSendHeaders', 'onHeadersReceived'].map(
      (name) => [
        name,
        (_filter, callback) => {
          hooks[name] = callback;
        },
      ],
    ),
  );
  const source = {
    url: 'https://tv.example/live.m3u8',
    referrer: 'https://tv.example/',
    userAgent: 'IPTV Player',
  };
  configurePlayerNetwork(
    webRequest,
    () => 10,
    () => source,
  );
  const request = {
    webContentsId: 10,
    initiatorOrigin: 'app://toolkit',
    resourceType: 'xhr',
    url: source.url,
    requestHeaders: {},
    responseHeaders: { 'Content-Type': ['application/vnd.apple.mpegurl'] },
  };
  let result;
  hooks.onBeforeRequest(request, (value) => {
    result = value;
  });
  assert.equal(result.cancel, false);
  hooks.onBeforeRequest(
    { ...request, url: 'http://127.0.0.1/admin' },
    (value) => {
      result = value;
    },
  );
  assert.equal(result.cancel, true);
  hooks.onBeforeRequest({ ...request, resourceType: 'script' }, (value) => {
    result = value;
  });
  assert.equal(result.cancel, true);
  hooks.onHeadersReceived(
    { ...request, initiatorOrigin: 'https://other.example' },
    (value) => {
      result = value;
    },
  );
  assert.deepEqual(result, {});
  hooks.onHeadersReceived(request, (value) => {
    result = value;
  });
  assert.deepEqual(result.responseHeaders['Access-Control-Allow-Origin'], [
    '*',
  ]);
  const headers = playerRequestHeaders(
    { Cookie: 'secret', Authorization: 'secret', Range: 'bytes=0-' },
    source,
  );
  assert.equal(headers.Cookie, undefined);
  assert.equal(headers.Authorization, undefined);
  assert.equal(headers.Range, 'bytes=0-');
  assert.equal(headers.Referer, source.referrer);
});
