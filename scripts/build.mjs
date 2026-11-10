// Static site build: content/ + data/ + static/  ->  dist/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const SITE = 'https://hanlanyi.github.io';
const TITLE = 'Han, Lanyi';
const TAGLINE = 'AI + AR';
const ISSUES = 'https://github.com/hanlanyi/hanlanyi.github.io/issues';

const SOCIAL = [
  ['youtube', 'YouTube', 'https://youtube.com/@hanlanyi'],
  ['patreon', 'Patreon', 'https://www.patreon.com/hanlanyi'],
  ['instagram', 'Instagram', 'https://instagram.com/hanlanyi'],
  ['github', 'GitHub', 'https://github.com/hanlanyi'],
  ['linkedin', 'LinkedIn', 'https://www.linkedin.com/in/lanyihan/'],
  ['x', 'X', 'https://x.com/HANLanyiAA'],
  ['itchdotio', 'itch.io', 'https://hanlanyi.itch.io'],
  ['medium', 'Medium', 'https://medium.com/@hanlanyi'],
  ['tiktok', 'TikTok', 'https://www.tiktok.com/@hanlanyi'],
  ['reddit', 'Reddit', 'https://www.reddit.com/user/hanlanyi/'],
];

/* ---------- helpers ---------- */
const read = (...p) => fs.readFileSync(path.join(ROOT, ...p), 'utf8');
const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const write = (rel, body) => {
  const file = path.join(DIST, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, body);
};
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const niceDate = (iso) => { const [y, m, d] = iso.slice(0, 10).split('-'); return `${Number(d)} ${MONTHS[m - 1]} ${y}`; };
const compact = (n) => new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(n);

function icon(slug) {
  const d = (read('static', 'icons', `${slug}.svg`).match(/<path d="([^"]+)"/) || [])[1];
  if (!d) throw new Error(`icon ${slug} has no path`);
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>`;
}

function frontMatter(src) {
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { meta: {}, body: src };
  const meta = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (!kv) continue;
    meta[kv[1]] = kv[2].trim().replace(/^"(.*)"$/, '$1').replace(/\\_/g, ' ');
  }
  return { meta, body: m[2] };
}

const plain = (html) => html.replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/g, ' ').replace(/\s+/g, ' ').trim();

/* ---------- content ---------- */
const posts = fs.readdirSync(path.join(ROOT, 'content', 'posts')).filter((f) => f.endsWith('.md')).map((f) => {
  const { meta, body } = frontMatter(read('content', 'posts', f));
  if (!meta.date) throw new Error(`${f}: missing "date:" in front matter`);
  const slug = f.replace(/\.md$/, '');
  // url_date pins a permalink that Hexo generated in a different timezone.
  const [y, mo, d] = (meta.url_date || meta.date).slice(0, 10).split('-');
  const html = marked.parse(body).replace(/<img /g, '<img loading="lazy" ');
  const text = plain(html);
  // First real paragraph, skipping the standing "leave a comment" greeting.
  const paras = [...html.matchAll(/<p>([\s\S]*?)<\/p>/g)].map((x) => plain(x[1])).filter((p) => p.length > 60 && !p.startsWith('Hi there!'));
  const excerpt = (paras[0] || '').slice(0, 190).replace(/\s+\S*$/, '') + (paras[0] && paras[0].length > 190 ? '…' : '');
  return {
    slug, title: meta.title || slug, date: meta.date.slice(0, 10), html, text, excerpt,
    minutes: Math.max(1, Math.round(text.split(' ').length / 220)),
    url: `/${y}/${mo}/${d}/${slug}/`, // same permalinks the Hexo site used
  };
}).sort((a, b) => b.date.localeCompare(a.date));

const videos = JSON.parse(read('data', 'videos.json')).videos;
const journey = JSON.parse(read('data', 'journey.json'));
const about = marked.parse(frontMatter(read('content', 'about.md')).body);

/* ---------- layout ---------- */
const socialList = (cls) => `<ul class="${cls}">${SOCIAL.map(([slug, name, url]) =>
  `<li><a href="${url}" target="_blank" rel="noopener me" title="${name}" aria-label="${name}">${icon(slug)}</a></li>`).join('')}</ul>`;

function page({ title, description, url, body, cls = '', scripts = '' }) {
  const full = title ? `${title} · ${TITLE}` : `${TITLE} · ${TAGLINE}`;
  const nav = [['/', 'Videos'], ['/aaa/', 'AAA'], ['/posts/', 'Writing'], ['/spatial/', 'Spatial'], ['/about/', 'About']]
    .map(([href, label]) => `<a href="${href}"${href === url || (href === '/posts/' && cls.includes('reading')) ? ' aria-current="page"' : ''}>${label}</a>`).join('');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(full)}</title>
<meta name="description" content="${esc(description || 'Videos and writing on AI and AR by Han, Lanyi.')}">
<meta property="og:title" content="${esc(full)}">
<meta property="og:url" content="${SITE}${url}">
<link rel="canonical" href="${SITE}${url}">
<link rel="icon" href="/pic/00HANN.ico">
<link rel="alternate" type="application/atom+xml" title="${TITLE}" href="/atom.xml">
<link rel="stylesheet" href="/css/site.css">
<script>try{if(/[?&]hud=1/.test(location.search))localStorage.hud='1';if(/[?&]hud=0/.test(location.search))localStorage.hud='0';if(localStorage.hud==='1')document.documentElement.dataset.hud='on'}catch(e){}</script>
</head>
<body class="${cls}">
<a class="skip" href="#main">Skip to content</a>
<header class="top">
  <a class="brand" href="/"><img class="brand-mark" src="/pic/avatar.png" alt="" width="28" height="28"><span class="brand-en">Han, Lanyi</span><span class="brand-cjk" lang="zh">韩蓝毅</span><span class="brand-cjk" lang="ko">한람의</span></a>
  ${socialList('social')}
  <nav class="nav" aria-label="Site">${nav}</nav>
  <div class="tools">
    <button type="button" data-palette-open>Search <kbd>/</kbd></button>
    <button type="button" data-hud-toggle aria-pressed="false" title="Black background and large type for see-through AR glasses">Glasses mode <kbd>G</kbd></button>
  </div>
</header>
<main id="main">
${body}
</main>
<footer class="foot">
  <p>© ${new Date().getFullYear()} Han, Lanyi · <a href="/atom.xml">RSS</a> · <a href="${ISSUES}">Say hi</a></p>
  ${socialList('social social-foot')}
</footer>
<script src="/js/site.js" defer></script>
${scripts}
</body>
</html>
`;
}

const postList = (items) => `<ol class="posts">${items.map((p) => `
  <li><a href="${p.url}">
    <time datetime="${p.date}">${niceDate(p.date)}</time>
    <span class="post-title">${esc(p.title)}</span>
    <span class="post-excerpt">${esc(p.excerpt)}</span>
    <span class="post-min">${p.minutes} min</span>
  </a></li>`).join('')}</ol>`;

/* ---------- build ---------- */
// retries: on Windows a preview server reading dist/ can briefly block the delete
fs.rmSync(DIST, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
fs.cpSync(path.join(ROOT, 'static'), DIST, { recursive: true });
fs.rmSync(path.join(DIST, 'icons'), { recursive: true, force: true }); // icons are inlined
write('.nojekyll', '');

// Home: the channel comes first.
const [hero, ...rest] = videos;
const thumb = (id, q = 'mqdefault') => `https://i.ytimg.com/vi/${id}/${q}.jpg`;
const queueItem = (v, current) => `
  <li><a href="https://www.youtube.com/watch?v=${v.id}" data-video="${v.id}" data-title="${esc(v.title)}" data-date="${niceDate(v.published)}" data-views="${compact(v.views)}"${current ? ' aria-current="true"' : ''}>
    <img src="${thumb(v.id)}" alt="" width="320" height="180" loading="lazy">
    <span class="q-title">${esc(v.title)}</span>
    <span class="q-meta">${niceDate(v.published)} · ${compact(v.views)} views</span>
  </a></li>`;

write('index.html', page({
  url: '/',
  cls: 'home t-white',
  body: `
<section class="stage" aria-label="Videos">
  <div class="screen">
    <div class="player" data-player data-id="${hero.id}">
      <button type="button" class="poster" aria-label="Play video">
        <img src="${thumb(hero.id, 'hqdefault')}" alt="" width="480" height="360">
        <span class="play" aria-hidden="true"></span>
      </button>
    </div>
    <div class="now">
      <p class="eyebrow"><span data-now-label>Latest video</span> · <span data-now-date>${niceDate(hero.published)}</span> · <span data-now-views>${compact(hero.views)}</span> views</p>
      <h1 data-now-title>${esc(hero.title)}</h1>
      <p class="now-links"><a data-now-link href="https://www.youtube.com/watch?v=${hero.id}" target="_blank" rel="noopener">Open on YouTube</a><a class="sub" href="https://www.youtube.com/@hanlanyi?sub_confirmation=1" target="_blank" rel="noopener">Subscribe</a></p>
    </div>
  </div>
  <div class="queue-wrap">
    <h2 class="eyebrow">All videos · ${videos.length}</h2>
    <ol class="queue">${queueItem(hero, true)}${rest.map((v) => queueItem(v, false)).join('')}</ol>
  </div>
</section>
<section class="han" aria-label="What H, A and N stand for">
  <div><b class="tile tile-h" aria-hidden="true">H</b><p><strong>History</strong>Yellow tiles and red walls: the colours of Chinese architecture.</p></div>
  <div><b class="tile tile-a" aria-hidden="true">A</b><p><strong><a href="/aaa/">AI + AR</a></strong>The green of cyberspace in Ghost in the Shell.</p></div>
  <div><b class="tile tile-n" aria-hidden="true">N</b><p><strong><a href="/about/#journey">Nomad</a></strong>Blue sky, blue sea, and a life lived in many places.</p></div>
</section>
<section class="project" aria-labelledby="p">
  <div class="project-text">
    <p class="eyebrow">Project · Mixed reality on Meta Quest</p>
    <h2 id="p"><a href="/aaa/">AAA <span>Atto, Acco, Anno</span></a></h2>
    <p>Three agents that live in your room. Ask in plain language and they plan, fly, build, and reshape a body made of 27 cubes. All on a local model.</p>
    <p><a class="project-go" href="/aaa/">Meet the three agents</a></p>
  </div>
  <a class="project-art" href="/aaa/" aria-hidden="true" tabindex="-1">${'<i></i>'.repeat(27)}</a>
</section>
<section class="writing" aria-labelledby="w">
  <div class="section-head"><h2 id="w">Writing</h2><a href="/posts/">All ${posts.length} posts</a></div>
  ${postList(posts.slice(0, 4))}
</section>`,
}));

// Writing index (also served at the old /archives/ address).
const writingBody = `<section class="writing page-pad"><div class="section-head"><h1>Writing</h1><span>${posts.length} posts</span></div>${postList(posts)}</section>`;
write('posts/index.html', page({ title: 'Writing', url: '/posts/', cls: 't-red', body: writingBody }));
write('archives/index.html', page({ title: 'Writing', url: '/posts/', cls: 't-red', body: writingBody }));

// Posts.
posts.forEach((p, i) => {
  const newer = posts[i - 1], older = posts[i + 1];
  write(`${p.url}index.html`, page({
    title: p.title, description: p.excerpt, url: p.url, cls: 'reading t-red',
    body: `
<article class="post" data-article>
  <header class="post-head">
    <p class="eyebrow"><time datetime="${p.date}">${niceDate(p.date)}</time> · ${p.minutes} min read</p>
    <h1>${esc(p.title)}</h1>
  </header>
  <div class="prose">${p.html}</div>
  <footer class="post-foot">
    <a class="comment" href="${ISSUES}" target="_blank" rel="noopener">Leave a comment on GitHub</a>
    <nav class="pager" aria-label="More posts">
      ${older ? `<a href="${older.url}"><span>Older</span>${esc(older.title)}</a>` : '<span></span>'}
      ${newer ? `<a class="next" href="${newer.url}"><span>Newer</span>${esc(newer.title)}</a>` : ''}
    </nav>
  </footer>
</article>
<div class="prompter" data-prompter hidden>
  <button type="button" data-prompter-toggle>Auto-scroll</button>
  <button type="button" data-prompter-slower aria-label="Slower">−</button>
  <output data-prompter-speed>40</output>
  <button type="button" data-prompter-faster aria-label="Faster">+</button>
  <span class="prompter-hint">Space · − / +</span>
</div>`,
  }));
});

// About.
write('about/index.html', page({
  title: 'About', url: '/about/', cls: 't-blue',
  body: `<article class="post"><header class="post-head"><p class="eyebrow">${TAGLINE}</p><h1>About</h1></header>
<div class="prose">
<p>AI engineer working where language models meet augmented reality. Physics by training, which is why this site has a mode built for see-through optics.</p>
${about.replace(/<p><a href="[^"]+">[^<]+<\/a><\/p>\s*/g, '')}
</div>
<ul class="links">${SOCIAL.map(([slug, name, url]) => `<li><a href="${url}" target="_blank" rel="noopener me">${icon(slug)}<span>${name}</span><span class="links-url">${url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}</span></a></li>`).join('')}</ul>
<section class="journey" id="journey" data-globe aria-labelledby="journey-h">
  <div class="journey-text">
    <p class="eyebrow"><b class="tile tile-n" aria-hidden="true">N</b> Nomad</p>
    <h2 id="journey-h">From ${journey[0].city} to ${journey[journey.length - 1].city}</h2>
    <p class="journey-now" aria-live="polite"><span data-globe-count>1 / ${journey.length}</span><strong data-globe-city>${journey[0].city}</strong><span data-globe-sub>${journey[0].local} · ${journey[0].country}</span></p>
    <div class="journey-nav">
      <button type="button" data-globe-prev>← Previous</button>
      <button type="button" data-globe-next>Next →</button>
    </div>
    <ol class="journey-stops">${journey.map((s) => `<li><button type="button" data-globe-stop>${s.city}</button></li>`).join('')}</ol>
  </div>
  <div class="journey-globe"><canvas role="img" aria-label="Globe showing the route ${journey.map((s) => s.city).join(', ')}. Drag to rotate."></canvas></div>
  <script type="application/json">${JSON.stringify(journey)}</script>
</section>
</article>`,
  scripts: '<script src="/js/globe.js" defer></script>',
}));

// AAA project page with the Anno demo.
write('aaa/index.html', page({
  title: 'AAA: Atto, Acco, Anno', url: '/aaa/', cls: 'aaa-page',
  description: 'AAA is a mixed-reality assistant for Meta Quest: three agents on a local LLM. Ask Atto, watch Acco build, reshape Anno.',
  body: read('content', 'aaa.html'),
  scripts: `<script type="application/json" id="aaa-data">${JSON.stringify({ shapes: JSON.parse(read('data', 'anno_shapes.json')), qa: JSON.parse(read('data', 'atto_qa.json')) }).replace(/</g, '\\u003c')}</script>\n<script src="/js/aaa-demo.js" defer></script>`,
}));

// Spatial wall.
write('spatial/index.html', page({
  title: 'Spatial', url: '/spatial/', cls: 'spatial-page',
  description: 'Everything on this site as a wall in depth, with side-by-side stereo output for AR glasses.',
  body: `
<section class="spatial" data-spatial>
  <div class="spatial-bar">
    <p><strong>Spatial wall.</strong> <kbd>←</kbd> <kbd>→</kbd> move · <kbd>Enter</kbd> open · <kbd>S</kbd> side-by-side 3D · <kbd>[</kbd> <kbd>]</kbd> depth</p>
    <div class="spatial-actions">
      <button type="button" data-spatial-prev aria-label="Previous">←</button>
      <button type="button" data-spatial-next aria-label="Next">→</button>
      <button type="button" data-spatial-stereo aria-pressed="false">Side-by-side 3D</button>
    </div>
  </div>
  <div class="spatial-view" data-spatial-view tabindex="0" aria-label="Spatial wall of videos and posts"></div>
  <noscript><p class="page-pad">The spatial wall needs JavaScript. Everything in it is also on the <a href="/">home page</a>.</p></noscript>
</section>`,
  scripts: '<script src="/js/spatial.js" defer></script>',
}));

// Search / spatial index.
write('index.json', JSON.stringify([
  ...videos.map((v) => ({ k: 'video', t: v.title, u: `/?v=${v.id}`, d: v.published.slice(0, 10), x: v.description, img: thumb(v.id) })),
  ...posts.map((p) => ({ k: 'post', t: p.title, u: p.url, d: p.date, x: p.text.slice(0, 4000), e: p.excerpt })),
  { k: 'project', t: 'AAA: Atto, Acco, Anno', u: '/aaa/', x: 'mixed reality assistant meta quest agents local llm unity anno shape cubes aiarassistant' },
  ...[['Videos', '/'], ['Writing', '/posts/'], ['AAA project', '/aaa/'], ['Spatial wall', '/spatial/'], ['About', '/about/']].map(([t, u]) => ({ k: 'page', t, u })),
  ...SOCIAL.map(([, name, url]) => ({ k: 'link', t: name, u: url })),
]));

// Feed.
write('atom.xml', `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
<title>${TITLE}</title><id>${SITE}/</id><link href="${SITE}/"/><link rel="self" href="${SITE}/atom.xml"/>
<updated>${posts[0].date}T00:00:00Z</updated><author><name>Han, Lanyi</name></author>
${posts.map((p) => `<entry><title>${esc(p.title)}</title><id>${SITE}${p.url}</id><link href="${SITE}${p.url}"/><updated>${p.date}T00:00:00Z</updated><summary>${esc(p.excerpt)}</summary><content type="html">${esc(p.html)}</content></entry>`).join('\n')}
</feed>
`);

write('404.html', page({ title: 'Not found', url: '/404.html', body: '<section class="page-pad"><h1>Nothing at this address.</h1><p>Press <kbd>/</kbd> to search, or go <a href="/">home</a>.</p></section>' }));

console.log(`built ${posts.length} posts, ${videos.length} videos -> dist/`);
