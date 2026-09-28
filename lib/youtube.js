import { channels } from '@/data/site';

/**
 * Latest uploads from Samuel's YouTube channel, shaped like the entries in
 * data/content.js so VideoCard renders them unchanged. Runs on the server only.
 *
 * Source, in order: the official YouTube Data API when YOUTUBE_API_KEY is set
 * (1 quota unit per refresh; the default allowance is 10,000 a day), otherwise
 * YouTube's public RSS feed, which works but is known to refuse requests from
 * cloud servers now and then.
 *
 * Failures: with nothing configured it returns []. When a channel is configured
 * but YouTube cannot be reached, it throws during a background refresh, so Next
 * keeps serving the last good page instead of an empty grid; during the build
 * itself it returns [] so a YouTube hiccup can never break a deploy.
 */

const REFRESH = 3600; // seconds; pages that list videos revalidate on the same clock
const KEY = process.env.YOUTUBE_API_KEY;
const building = process.env.NEXT_PHASE === 'phase-production-build';

async function get(url, as = 'json') {
  // The channel page used for a handle lookup is ~2 MB, too big for Next's data cache, so it is never cached.
  const res = await fetch(url, as === 'html' ? { cache: 'no-store' } : { next: { revalidate: REFRESH } });
  if (!res.ok) throw new Error(`YouTube ${res.status} for ${url.replace(/key=[^&]+/, 'key=…')}`);
  return as === 'json' ? res.json() : res.text();
}

async function channelId({ handle, channelId: id }) {
  if (id) return id;
  if (!handle) return null;
  const at = handle.replace(/^@/, '');
  if (KEY) {
    const data = await get(`https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=${encodeURIComponent('@' + at)}&key=${KEY}`);
    return data.items?.[0]?.id ?? null;
  }
  const html = await get(`https://www.youtube.com/@${encodeURIComponent(at)}`, 'html');
  return html.match(/<link rel="canonical" href="https:\/\/www\.youtube\.com\/channel\/(UC[\w-]{22})"/)?.[1] ?? null;
}

const firstLine = (text = '') => {
  const line = text.split('\n').map(s => s.trim()).find(Boolean) ?? '';
  return line.length > 140 ? `${line.slice(0, 137).trimEnd()}…` : line;
};

const card = ({ id, title, date, description }) => ({
  slug: `yt-${id}`,
  title,
  date,
  blurb: firstLine(description),
  thumb: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
  href: `https://www.youtube.com/watch?v=${id}`,
});

async function fromApi(id, max) {
  // Every channel's uploads live in a playlist whose id is the channel id with UC swapped for UU.
  const data = await get(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=${max}&playlistId=UU${id.slice(2)}&key=${KEY}`);
  return (data.items ?? [])
    .map(({ snippet: s }) => ({ id: s.resourceId?.videoId, title: s.title, date: s.publishedAt, description: s.description }))
    .filter(v => v.id && v.title !== 'Private video' && v.title !== 'Deleted video');
}

const decode = (s = '') => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");

async function fromFeed(id, max) {
  const xml = await get(`https://www.youtube.com/feeds/videos.xml?channel_id=${id}`, 'text');
  return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].slice(0, max).map(([, e]) => ({
    id: e.match(/<yt:videoId>([^<]+)</)?.[1],
    title: decode(e.match(/<title>([^<]*)</)?.[1]),
    date: e.match(/<published>([^<]+)</)?.[1],
    description: decode(e.match(/<media:description>([\s\S]*?)<\/media:description>/)?.[1]),
  })).filter(v => v.id);
}

export async function latestVideos(max = 12) {
  const config = channels.youtube;
  if (!config.handle && !config.channelId) return [];
  try {
    const id = await channelId(config);
    if (!id) throw new Error(`No YouTube channel found for "${config.handle || config.channelId}"`);
    return (await (KEY ? fromApi(id, max) : fromFeed(id, max))).map(card);
  } catch (error) {
    if (building) {
      console.warn(`[youtube] ${error.message}; building without the video grid, it fills in on the next refresh.`);
      return [];
    }
    throw error;
  }
}

export const VIDEO_REFRESH = REFRESH;
