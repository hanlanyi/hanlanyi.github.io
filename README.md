# hanlanyi.github.io

Personal site: YouTube channel first, writing second. No framework; one Node build script.

## Use

```
npm install
npm run videos   # refresh data/videos.json from the channel's RSS feed
npm run dev      # build to dist/ and serve at http://localhost:4000
```

## Write a post

Add `content/posts/<slug>.md` with front matter:

```
---
title: My title
date: 2026-01-31 10:00:00
---
```

The URL is `/YYYY/MM/DD/<slug>/`, the same scheme the old Hexo site used. Images go in `static/pic/` and are referenced as `/pic/name.png`.

## Layout

- `content/` posts and the about text (Markdown)
- `data/videos.json` video list, merged from the RSS feed (the feed only carries the 15 newest, so commit this file now and then)
- `static/` CSS, JS, images, brand icons (Simple Icons, CC0)
- `scripts/build.mjs` builds everything into `dist/`
- `.github/workflows/deploy.yml` builds and deploys to GitHub Pages on push and once a day

## Site features

- **Glasses mode** (`G`, or add `?hud=1` to any URL): true-black background and large type for see-through AR glasses, where black is transparent. On posts it adds an auto-scroll teleprompter (`Space`, `-` / `+`).
- **Spatial wall** (`/spatial/`): videos and posts in depth; `S` switches to side-by-side stereo output for glasses in SBS 3D mode, `[` / `]` adjust depth.
- **Search** (`/` or `Ctrl+K`): jump to any video, post or link.
