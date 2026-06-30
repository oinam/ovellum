---
'ovellum': minor
---

WebP conversion — `site.images.format`. Set `site.images: { format: 'webp' }` to
convert raster images to WebP during the build instead of re-compressing them in
place: `.png`/`.jpg`/`.jpeg` assets are written as a sibling `.webp` (much
smaller, ~97% browser support) and the matching Markdown `<img src>` references
are rewritten to point at the new files — so `![](/img/hero.png)` resolves to
`/img/hero.webp` with no edits on your part. Other formats and external/`data:`
URLs are left alone. Not compatible with `site.assetBaseUrl` (a CDN serves the
originals); rewrites Markdown body images only. Uses the optional `sharp` peer.
