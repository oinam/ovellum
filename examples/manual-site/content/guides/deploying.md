---
title: Deploying
description: Drop the dist/ folder anywhere that serves static files.
---

# Deploying your site

Once `ovellum build` finishes, the entire site lives in `dist/`. Drop it on
any static host — there's nothing dynamic to configure.

## Quick options

### Netlify

```bash
npx netlify deploy --prod --dir=dist
```

### Vercel

```bash
npx vercel --prod dist
```

### GitHub Pages

Push the `dist/` directory to a `gh-pages` branch (or configure Pages to
serve from a subfolder of `main`).

### Plain Nginx / static-hosting

Point your server root at `dist/`. Pretty URLs work out of the box because
each page is `name/index.html` — no rewrites needed.

## Things to remember

- Set `site.baseUrl` in `ovellum.config.json` to your final URL so the
  canonical `<link>` tag and OG card URLs come out right.
- The site has no service worker, no cookies, no analytics — what you
  ship is what runs.
- Total runtime JavaScript is around 1.5KB: theme toggle + copy buttons.
