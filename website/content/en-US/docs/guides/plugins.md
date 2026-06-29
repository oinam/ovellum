---
title: Plugins
description: Extend the build with plugins — lifecycle hooks for config, per-page transforms, and deploy logic (onBuildComplete).
---

# Plugins

A plugin is a named unit of **build lifecycle hooks**. Plugins are where deploy
logic lives (`onBuildComplete`), where you tweak config from the environment
(`onResolveConfig`), and where you post-process rendered pages (`transformPage`).
They compose: list several, and each hook runs in order.

> Plugins are functions, so they live in a **TS or JS config**
> (`ovellum.config.ts` / `.js`) — a JSON config can't carry them. They also flow
> through the [programmatic API](/docs/guides/automation/#programmatic-api)
> (`build({ plugins: [...] })`).

## Declaring plugins

```ts
// ovellum.config.ts
import { defineConfig } from 'ovellum';

export default defineConfig({
  plugins: [
    {
      name: 'deploy-to-cdn',
      onBuildComplete: async ({ outDir, manifest }) => {
        await syncToCdn(outDir, manifest.files); // your deploy
      },
    },
  ],
});
```

A plugin is `{ name, ...hooks }`. `name` identifies it in logs and error
messages; every hook is optional and may be `async`. A third-party plugin is
just a function that returns such an object — `plugins: [myPlugin()]`.

## Lifecycle hooks

Hooks fire in this order, each across all plugins in array order:

| Hook | When | Gets | Returns |
| ---- | ---- | ---- | ------- |
| `onResolveConfig` | After the config loads + CLI overrides apply, before building | the resolved `OvellumConfig` | a config to **replace** it (chained), or nothing |
| `onBuildStart` | Once, before any output | `{ config, cwd, mode }` | — |
| `transformPage` | Per rendered HTML page (manual mode), before write | `{ url, html, outputPath, frontmatter? }` | `{ html }` to **replace** the page, or nothing |
| `onBuildComplete` | After the build finishes | `{ outDir, manifest, cwd, mode }` | — |

A hook that throws fails the build with a message attributed to the plugin —
`[plugin: <name>] <hook> failed: …` — so a broken plugin is never silent.

### `onResolveConfig` — config from the environment

```ts
{
  name: 'preview-url',
  onResolveConfig: (config) =>
    process.env.DEPLOY_URL
      ? { ...config, site: { ...config.site, baseUrl: process.env.DEPLOY_URL } }
      : undefined, // unchanged
}
```

Return a config to replace it (later plugins see your version); return nothing
to leave it untouched. CLI overrides (`--out` / `--base`) are applied **after**
hooks, so the most explicit source still wins. The returned config is used
as-is — you own its validity.

### `transformPage` — post-process each page

Fires for every rendered HTML page of a **manual-mode** site (the landing, each
doc page, the 404), just before it's written. Return `{ html }` to replace it;
plugins chain, so each sees the previous one's HTML.

```ts
{
  name: 'inject-banner',
  transformPage: ({ url, html }) => ({
    html: html.replace('<body>', '<body><div class="preview-banner">Preview</div>'),
  }),
}
```

(Auto/hybrid output is Markdown, not pages, so `transformPage` doesn't fire
there.)

### `onBuildComplete` — the deploy hook

Fires once after the build. `outDir` is the absolute output path, and
`manifest` is the [deploy inventory](/docs/guides/automation/) (every file with
its size + sha256) — **always computed when a plugin defines this hook**, even
without `--manifest`, so a deploy plugin always has the file list.

```ts
{
  name: 'deploy',
  onBuildComplete: async ({ outDir, manifest }) => {
    // upload only what changed, verify completeness, etc.
    for (const file of manifest.files) await upload(outDir, file.path, file.sha256);
  },
}
```

This is the "Ovellum builds; the host deploys" contract made concrete: Ovellum
hands you a finished folder + an inventory, and your hook takes it from there.

## Markdown plugins

A plugin can extend the Markdown pipeline with
[remark](https://github.com/remarkjs/remark) and
[rehype](https://github.com/rehypejs/rehype) plugins — each a unified
`Pluggable` (a plugin function, or a `[plugin, options]` tuple):

```ts
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

export default defineConfig({
  plugins: [
    { name: 'math', remarkPlugins: [remarkMath], rehypePlugins: [rehypeKatex] },
  ],
});
```

`remarkPlugins` run after Ovellum's built-in remark plugins and before the HTML
conversion; `rehypePlugins` run on the HTML tree. They apply to manual-mode page
rendering (doc pages + landing prose).

> **Security:** `rehypePlugins` are injected **before sanitization** — Ovellum's
> sanitize step is the guard over everything they produce, so a plugin can't
> inject `<script>` or other unsafe HTML. (A `<script>` a rehype plugin adds is
> stripped, same as raw HTML in a page.) If you need an element/attribute the
> sanitizer drops, that's a deliberate boundary, not a bug.

## Related: replacing the theme assets

Plugins cover config, per-page HTML, Markdown extensions, and deploy. The other
half of customization is the **CSS/JS layer**:

- [`site.css`](/docs/guides/themes/#customizing-the-default-theme) — layer extra
  stylesheets (override design tokens, add rules).
- [`site.templateDir`](/docs/guides/themes/#bring-your-own-template-directory) —
  replace the bundled `ovellum.css` / `ovellum.js` / fonts wholesale with your
  own, no fork required.

The page **HTML structure** is generated in code; a full layout/partial system
(beyond CSS/JS) is intentionally out of scope for now.
