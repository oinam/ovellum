---
'ovellum': minor
---

Image optimization — `site.images` (B9 slice 1). Opt-in raster re-compression:
set `site.images: { quality? }` to re-encode `.jpg`/`.jpeg`/`.png`/`.webp`/`.avif`
assets **in place** during the build — same path and format, smaller bytes, so
your `<img src>` references never change. Lossy formats use `quality` (1–100,
default 80); PNG is recompressed losslessly. If a re-encode would be larger (the
image is already optimized) the original is kept, so optimization never grows a
file; SVG and GIF pass through. The build reports how many images it optimized
and the bytes saved.

Optimization uses [sharp](https://sharp.pixelplumbing.com) as an **optional peer
dependency**, lazy-loaded only when `site.images` is set — install it with
`npm i sharp`. Default installs stay lean (sharp never enters the tree unless you
opt in). Format conversion (→ webp/avif) and per-page OG-image generation are
planned follow-ups.
