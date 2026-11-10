// Pulls the channel's public RSS feed and merges it into data/videos.json.
// The feed only lists the 15 newest uploads, so we merge instead of overwrite.
import fs from 'node:fs';

const CHANNEL = 'UCrgATm2Cr_rK_VoARwFBFFA';
const FILE = new URL('../data/videos.json', import.meta.url);

const decode = (s = '') =>
  s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, '&');
const pick = (s, re) => (s.match(re) || [])[1] || '';

const existing = fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE, 'utf8')) : { videos: [] };

try {
  const res = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const xml = await res.text();
  const fresh = xml.split('<entry>').slice(1).map((e) => ({
    id: pick(e, /<yt:videoId>([^<]+)/),
    title: decode(pick(e, /<title>([^<]*)/)),
    published: pick(e, /<published>([^<]+)/),
    views: Number(pick(e, /views="(\d+)"/)) || 0,
    description: decode(pick(e, /<media:description>([\s\S]*?)<\/media:description>/)).trim().slice(0, 500),
  })).filter((v) => v.id);
  if (!fresh.length) throw new Error('feed had no entries');

  const byId = new Map(existing.videos.map((v) => [v.id, v]));
  for (const v of fresh) byId.set(v.id, v);
  const videos = [...byId.values()].sort((a, b) => b.published.localeCompare(a.published));
  fs.writeFileSync(FILE, JSON.stringify({ channel: CHANNEL, videos }, null, 2) + '\n');
  console.log(`videos: ${videos.length} total (${fresh.length} from feed)`);
} catch (err) {
  // Never break a deploy because YouTube was unreachable: keep what we have.
  console.warn(`videos: fetch failed (${err.message}); keeping ${existing.videos.length} existing`);
}
