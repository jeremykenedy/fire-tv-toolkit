import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

export const ALL_CHANNELS_PLAYLIST =
  'https://iptv-org.github.io/iptv/index.m3u';
const API = 'https://iptv-org.github.io/api/';
const CACHE_AGE_MS = 12 * 60 * 60 * 1000;

export function streamUrl(value) {
  try {
    const url = new URL(value);
    if (
      !['https:', 'http:'].includes(url.protocol) ||
      url.username ||
      url.password
    )
      return null;
    const host = url.hostname;
    if (
      host === 'localhost' ||
      host.endsWith('.localhost') ||
      host.endsWith('.local') ||
      host === '[::1]' ||
      host.startsWith('[fe80:') ||
      host.startsWith('[fc') ||
      host.startsWith('[fd')
    )
      return null;
    if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
      const [a, b] = host.split('.').map(Number);
      if (
        [0, 10, 127].includes(a) ||
        (a === 169 && b === 254) ||
        (a === 172 && b >= 16 && b <= 31) ||
        (a === 192 && b === 168) ||
        a >= 224
      )
        return null;
    }
    return url.href;
  } catch {
    return null;
  }
}

function text(value) {
  return typeof value === 'string' ? value : '';
}
function list(value) {
  return Array.isArray(value)
    ? value.filter((entry) => typeof entry === 'string')
    : [];
}
function hash(value) {
  return createHash('sha256').update(value).digest('hex').slice(0, 24);
}

export function buildChannels({ streams, channels, feeds }) {
  const metadata = new Map(
    channels
      .filter((entry) => entry && typeof entry.id === 'string')
      .map((entry) => [entry.id, entry]),
  );
  const feedMetadata = new Map(
    feeds
      .filter((entry) => entry && typeof entry.channel === 'string')
      .map((entry) => [`${entry.channel}@${entry.id}`, entry]),
  );
  const grouped = new Map();
  for (const source of streams) {
    if (!source || !streamUrl(source.url)) continue;
    const url = streamUrl(source.url);
    const info = metadata.get(source.channel);
    const feed = feedMetadata.get(`${source.channel}@${source.feed}`);
    const id = source.channel
      ? `${source.channel}${source.feed ? `@${source.feed}` : ''}`
      : `stream:${hash(url)}`;
    const channelName =
      text(info?.name) || text(source.title) || 'Unnamed channel';
    const feedName = text(feed?.name);
    const entry = grouped.get(id) || {
      id,
      name:
        feedName && !feed?.is_main
          ? `${channelName} / ${feedName}`
          : channelName,
      country: text(info?.country),
      categories: list(info?.categories),
      languages: [],
      sources: [],
    };
    entry.languages = [
      ...new Set([...entry.languages, ...list(feed?.languages)]),
    ];
    const referrer = streamUrl(source.referrer) || '';
    const userAgent = text(source.user_agent).replace(/[\r\n]/g, '');
    const sourceId = hash(`${url}\n${referrer}\n${userAgent}`);
    if (!entry.sources.some((candidate) => candidate.id === sourceId)) {
      entry.sources.push({
        id: sourceId,
        url,
        referrer,
        userAgent,
        quality: text(source.quality),
        labels: list(source.labels),
        title: text(source.title),
      });
    }
    grouped.set(id, entry);
  }
  for (const entry of grouped.values()) {
    entry.sources.sort(
      (a, b) =>
        Number(a.labels.includes('Geo-blocked')) -
          Number(b.labels.includes('Geo-blocked')) ||
        Number(b.url.startsWith('https:')) - Number(a.url.startsWith('https:')),
    );
  }
  return [...grouped.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function displayName(code, type) {
  try {
    return new Intl.DisplayNames(['en'], { type }).of(code) || code;
  } catch {
    return code;
  }
}

export function filterChannels(
  channels,
  {
    search = '',
    country = '',
    language = '',
    category = '',
    offset = 0,
    favorites = false,
  } = {},
  favoriteIds = [],
) {
  if (
    ![search, country, language, category].every(
      (value) => typeof value === 'string',
    ) ||
    !Number.isSafeInteger(offset) ||
    offset < 0 ||
    typeof favorites !== 'boolean'
  )
    throw new Error('Choose valid channel filters.');
  const query = search.trim().toLocaleLowerCase();
  const favoriteSet = new Set(favoriteIds);
  const filtered = channels.filter(
    (entry) =>
      (!query ||
        `${entry.name} ${entry.id} ${entry.sources.map((source) => source.title).join(' ')}`
          .toLocaleLowerCase()
          .includes(query)) &&
      (!country || entry.country === country) &&
      (!language || entry.languages.includes(language)) &&
      (!category || entry.categories.includes(category)) &&
      (!favorites || favoriteSet.has(entry.id)),
  );
  return {
    total: filtered.length,
    offset,
    channels: filtered
      .slice(offset, offset + 100)
      .map(({ sources, ...entry }) => ({
        ...entry,
        favorite: favoriteSet.has(entry.id),
        sources: sources.map(({ id, quality, labels, title }) => ({
          id,
          quality,
          labels,
          title,
        })),
      })),
  };
}

export function createIptvCatalog({
  dataDir,
  fetchImpl = fetch,
  now = () => Date.now(),
}) {
  const file = path.join(dataDir, 'iptv-catalog.json');
  const favoritesFile = path.join(dataDir, 'iptv-favorites.json');
  let snapshot = null;
  let pending = null;
  let favoriteIds = [];
  fs.mkdirSync(dataDir, { recursive: true });
  try {
    const saved = JSON.parse(fs.readFileSync(favoritesFile, 'utf8'));
    if (Array.isArray(saved))
      favoriteIds = saved.filter((id) => typeof id === 'string');
  } catch {
    /* Favorites start empty. */
  }
  try {
    const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (
      saved.version === 2 &&
      Array.isArray(saved.channels) &&
      Number.isFinite(saved.loadedAt)
    )
      snapshot = saved;
  } catch {
    /* A fresh catalog will be downloaded. */
  }

  async function load(force = false) {
    if (snapshot && !force && now() - snapshot.loadedAt < CACHE_AGE_MS)
      return snapshot;
    if (pending) return pending;
    pending = (async () => {
      try {
        const [streams, channels, feeds] = await Promise.all(
          ['streams', 'channels', 'feeds'].map(async (name) => {
            const response = await fetchImpl(`${API}${name}.json`, {
              signal: AbortSignal.timeout(20000),
            });
            if (!response.ok)
              throw new Error(`IPTV catalog returned HTTP ${response.status}.`);
            const data = await response.json();
            if (!Array.isArray(data))
              throw new Error('The IPTV catalog format was not recognized.');
            return data;
          }),
        );
        const entries = buildChannels({ streams, channels, feeds });
        if (!entries.length)
          throw new Error(
            'The IPTV catalog returned no channels. Try refreshing later.',
          );
        const updated = { version: 2, loadedAt: now(), channels: entries };
        const temporary = `${file}.tmp`;
        fs.writeFileSync(temporary, JSON.stringify(updated), { mode: 0o600 });
        fs.renameSync(temporary, file);
        snapshot = updated;
        return updated;
      } catch (error) {
        if (snapshot) return { ...snapshot, cached: true };
        throw new Error(`Could not load the IPTV catalog. ${error.message}`);
      } finally {
        pending = null;
      }
    })();
    return pending;
  }

  return {
    async query(filters = {}, refresh = false) {
      const data = await load(refresh === true);
      const countries = [
        ...new Set(data.channels.map((entry) => entry.country).filter(Boolean)),
      ]
        .map((id) => ({ id, name: displayName(id, 'region') }))
        .sort((a, b) => a.name.localeCompare(b.name));
      const languages = [
        ...new Set(data.channels.flatMap((entry) => entry.languages)),
      ]
        .map((id) => ({ id, name: displayName(id, 'language') }))
        .sort((a, b) => a.name.localeCompare(b.name));
      const categories = [
        ...new Set(data.channels.flatMap((entry) => entry.categories)),
      ]
        .sort()
        .map((id) => ({ id, name: id.charAt(0).toUpperCase() + id.slice(1) }));
      return {
        ...filterChannels(data.channels, filters, favoriteIds),
        catalogTotal: data.channels.length,
        streamTotal: data.channels.reduce(
          (sum, entry) => sum + entry.sources.length,
          0,
        ),
        loadedAt: data.loadedAt,
        cached: data.cached === true,
        countries,
        languages,
        categories,
        playlist: ALL_CHANNELS_PLAYLIST,
      };
    },
    async source(channelId, sourceId) {
      const data = await load();
      const channel = data.channels.find((entry) => entry.id === channelId);
      const source = channel?.sources.find((entry) => entry.id === sourceId);
      if (!source)
        throw new Error(
          'This channel source is no longer in the catalog. Refresh the channel list.',
        );
      return { channel: channel.name, ...source };
    },
    async favorite(channelId, value) {
      if (typeof value !== 'boolean')
        throw new Error('Choose whether to save this channel.');
      const data = await load();
      if (!data.channels.some((entry) => entry.id === channelId))
        throw new Error('Choose a channel from the catalog.');
      favoriteIds = value
        ? [...new Set([...favoriteIds, channelId])]
        : favoriteIds.filter((id) => id !== channelId);
      const temporary = `${favoritesFile}.tmp`;
      fs.writeFileSync(temporary, JSON.stringify(favoriteIds), { mode: 0o600 });
      fs.renameSync(temporary, favoritesFile);
    },
  };
}
