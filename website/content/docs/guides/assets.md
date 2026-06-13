---
title: Assets & downloads
description: Where to put images, video, audio, PDFs, and other files — and how to reference, embed, or link them.
tags: [assets, images, video, audio, downloads]
---

# Assets & downloads

Images, video, audio, PDFs, fonts, zips — anything that isn't a Markdown page.
There are **two places** to put them, depending on whether the file belongs to
one page or should live at a stable site-wide URL.

## 1. Next to your content

Any non-Markdown file **anywhere in your content folder** is copied to the
output verbatim, keeping its path. This is the natural home for an asset tied to
a specific page or section:

```
content/
  guides/
    install.md
    architecture.svg     →  /guides/architecture.svg
    setup.zip            →  /guides/setup.zip
```

Reference it with a **root-absolute path** (a leading `/`):

```markdown
![Architecture](/guides/architecture.svg)
[Download the starter kit (4 MB)](/guides/setup.zip)
```

> **Use root-absolute paths, not relative ones.** Pages get pretty URLs
> (`guides/install.md` → `/guides/install/`), so a *relative* `architecture.svg`
> would resolve against `/guides/install/` rather than the folder the file is
> in. `/guides/architecture.svg` always points where you mean.

## 2. The `public/` folder → site root

The reserved [`publicDir`](/docs/reference/config/) (default `public/`) is
copied to the **site root** — the same convention as Next.js, Astro, Vite, and
Hugo (`static/`). Use it for files that must live at the root, and for shared
downloads you want at clean, permanent URLs:

```
content/
  public/
    favicon.ico          →  /favicon.ico
    robots.txt           →  /robots.txt
    report.pdf           →  /report.pdf
    media/intro.mp4      →  /media/intro.mp4
    downloads/app.zip    →  /downloads/app.zip
```

Nothing inside `public/` is processed — even a `.md` is copied as-is, never
turned into a page. Rename it with `site.publicDir` if you like.

**Rule of thumb:** a page-specific image → put it beside the page; a download or
shared asset that wants a tidy permanent URL (or a root-required file like
`favicon.ico` / `robots.txt`) → `public/`.

## By file type

### Images

```markdown
![A diagram of the build pipeline](/guides/pipeline.svg)
```

### PDFs, zips, and other downloads

A plain link — the browser opens or downloads it:

```markdown
[Read the spec (PDF, 1.2 MB)](/report.pdf)
[Download v1.0 (zip)](/downloads/app-1.0.zip)
```

### Video and audio

Embed a native player with raw HTML in your Markdown (it's allowed through the
sanitizer):

```html
<video src="/media/demo.mp4" controls width="720" poster="/media/cover.jpg"></video>

<audio controls>
  <source src="/media/talk.mp3" type="audio/mpeg" />
</audio>
```

Allowed attributes are presentational/playback only — `controls`, `width`,
`height`, `poster`, `preload`, `loop`, `muted`, `autoplay`, `playsinline`, plus
`<source>`/`<track>`. `src`/`poster` URLs are scheme-checked (`http(s)` or
relative), and event handlers (`onerror`, …) are stripped, so an embed can't
carry script. Prefer a small, web-optimised `.mp4`/`.webm`/`.mp3`; for large
media, a host like YouTube/Vimeo (linked) keeps your site light.

## Checking links

`ovellum check` validates internal **page** links. Asset URLs (images,
downloads) point at files rather than pages, so keep their paths correct
yourself — a quick local `ovellum serve` (or `ovellum dev`) is the fastest way
to confirm an image renders and a download resolves.
