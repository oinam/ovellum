---
title: Search
description: Full-text site search powered by Pagefind — a build-time index, queried entirely in the browser. No server, no service, no API keys.
---

# Search

Ovellum's site search is powered by [Pagefind](https://pagefind.app), a static,
client-side search engine. The index is built at `ovellum build` time from your
generated HTML; at runtime it's pure browser + WebAssembly — **no server, no
external service, no API keys**. It deploys as plain static files and works on
any host.

It's **off by default**. One flag turns it on.

## Enabling it

```json
{
  "site": {
    "search": { "enabled": true }
  }
}
```

On the next build, two things happen:

1. **Indexing.** After the site is written, Ovellum runs Pagefind over the
   output directory and emits a `dist/pagefind/` folder — the search index, the
   WebAssembly runtime, and the default UI assets.
2. **UI.** The topbar gains a search box. Press <kbd>⌘K</kbd> / <kbd>Ctrl-K</kbd>
   to focus it; results appear in a floating dropdown beneath it.

That's the whole setup — no other configuration, and Pagefind ships with
Ovellum, so there's nothing extra to install.

## How it works

- **Built at build, queried in the browser.** Pagefind reads the rendered HTML
  of every page and writes a compact, chunked index. The small UI script loads
  with the page; the index data itself is fetched in chunks **on demand as you
  type**, so initial page weight stays minimal even on large sites.
- **No backend.** Everything lives under `dist/pagefind/` as static files.
  There's no Algolia account, no service to run, nothing to keep in sync —
  deploy it like any other asset and search keeps working on a plain CDN.
- **Themed to match.** The default Pagefind UI is restyled through CSS variables
  to Ovellum's tokens (the same palette, radii, and fonts), so it looks native
  in both light and dark.

## What gets indexed

Pagefind indexes the **rendered content** of each built page — headings and body
text — so results reflect exactly what a reader sees. Because it runs against
the final output, it covers auto-generated API docs and hand-written prose
alike. The index is rebuilt from scratch on every `ovellum build`.

## Hosting

- The `dist/pagefind/` directory is part of your build output — upload it with
  everything else. Nothing special to configure on the host.
- Under a subpath (`site.basePath`), search still works: the UI resolves the
  index relative to the current page. See
  [Hosting under a subpath](/docs/guides/deploy/#hosting-under-a-subpath).

## Turning it off

Leave the flag out, or set `"enabled": false` (the default). Pagefind never
runs, `dist/pagefind/` isn't emitted, and the topbar shows no search box — zero
runtime cost.

See also the [`site.search`](/docs/reference/config/) field in the configuration
reference.
