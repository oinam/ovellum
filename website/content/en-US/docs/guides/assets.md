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

## 2. `public/` folder → site root

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

## Serving `public/` from a CDN

By default `public/` ships *with* your site. To serve it from a CDN or object
store instead, set [`site.assetBaseUrl`](/docs/reference/config/) — the same
idea as Vite's `base` or Next's `assetPrefix`:

```ts
export default {
  site: {
    assetBaseUrl: 'https://cdn.example.com/site',
  },
} satisfies OvellumUserConfig;
```

You keep authoring the **same root-absolute paths** (`/report.pdf`,
`/media/intro.mp4`). At build time Ovellum:

- **stops copying `public/` locally** — you upload its contents to the CDN
  yourself (one-time, or in your deploy step), and
- **rewrites every reference to a `public/` file** in the rendered HTML to the
  CDN, so `/report.pdf` becomes `https://cdn.example.com/site/report.pdf`.

Assets that live *next to your content* (section 1) are part of the HTML site
and are **left untouched** — only `public/` moves to the CDN. URLs that already
carry a query string or live in a `srcset` aren't rewritten; reference those
files by their final CDN URL directly.

## By file type

### Images

```markdown
![A diagram of the build pipeline](/guides/pipeline.svg)
```

#### Optimizing images

By default images are copied **verbatim**. To re-compress raster images
(`.jpg` / `.jpeg` / `.png` / `.webp` / `.avif`) during the build, set
[`site.images`](/docs/reference/config/):

```ts
site: {
  images: { quality: 80 }, // quality is optional (default 80)
}
```

Each image is re-encoded **in place** — same path and format, smaller bytes — so
your `![…](/img/hero.png)` references never change. Lossy formats use `quality`;
PNG is recompressed losslessly. If a re-encode would be *larger* (the image is
already optimized), Ovellum keeps the original, so optimization never makes a
file bigger. SVG and GIF pass through untouched. The build reports how many
images it optimized and the bytes saved.

> Optimization uses [**sharp**](https://sharp.pixelplumbing.com), an **optional**
> dependency that's only loaded when `site.images` is set — install it alongside
> Ovellum: `npm i sharp`. (It's left out of the default install so a docs site
> that doesn't optimize images stays lean.)

#### Minifying CSS and JS

If you ship your own `.css` / `.js` — files in your content folder, or a custom
[`templateDir`](/docs/guides/themes/#bring-your-own-template-directory)'s
`style.css` / `script.js` — set [`site.minify`](/docs/reference/config/) to
minify them during the build:

```ts
site: {
  minify: true,
}
```

It only touches **your** assets: the bundled default theme already ships
minified, and HTML pages aren't minified. A minified output that would be larger
than the original is discarded (the original is kept), and a file that fails to
minify is copied as-is with a warning. The build reports how many assets it
minified and the bytes saved.

> Minification uses [**esbuild**](https://esbuild.github.io), an **optional**
> dependency loaded only when `site.minify` is `true` — install it with
> `npm i esbuild`. Like image optimization, it's left out of the default install
> so a docs site that doesn't need it stays lean.

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
carry script. Prefer a small, web-optimized `.mp4`/`.webm`/`.mp3`.

### YouTube and Vimeo

Open the video on YouTube or Vimeo, hit **Share → Embed**, and paste the
`<iframe>` it gives you **verbatim** — no editing required:

```html
<iframe
  width="560"
  height="315"
  src="https://www.youtube.com/embed/VIDEO_ID"
  title="YouTube video player"
  frameborder="0"
  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
  referrerpolicy="strict-origin-when-cross-origin"
  allowfullscreen
></iframe>
```

Ovellum allows `<iframe>` **only from known video hosts** (`youtube.com`,
`youtube-nocookie.com`, `vimeo.com`), so an iframe pointing anywhere else (or at
a relative path) is removed during sanitization — you can't accidentally embed
an untrusted page. Survivors are hardened automatically (`loading="lazy"`, a
strict referrer policy) and wrapped in a responsive 16:9 frame, so the fixed
`width`/`height` in the pasted snippet don't matter. Prefer
`youtube-nocookie.com` if you want YouTube's privacy-preserving embed. See the
[styleguide](/docs/reference/styleguide/#video) for a live example.

## Checking links

`ovellum check` validates internal **page** links. Asset URLs (images,
downloads) point at files rather than pages, so keep their paths correct
yourself — a quick local `ovellum serve` (or `ovellum dev`) is the fastest way
to confirm an image renders and a download resolves.
