# PLUGINS — extension API design (B1 + D3)

Design pass for the plugin/extension API. Decided 2026-06-29 with the
maintainer. Implemented in slices; this doc is the north star.

## Model (decided)

A single **`plugins: OvellumPlugin[]`** array in config — the Vite/Rollup/Astro
model. One npm package = one plugin, bundling its lifecycle hooks and (later)
its markdown extensions under one named unit. Plugins run in **array order** for
each hook.

```ts
// ovellum.config.ts
plugins: [
  { name: 'deploy', onBuildComplete: ({ outDir, manifest }) => sync(outDir, manifest) },
  ovellumSomeRemarkPlugin(),   // 3rd-party, slice 2
]
```

Functions only survive in **TS/JS configs** (c12 loads them); a JSON config
can't carry plugins. That's inherent and acceptable — plugins are code.

## Slices

- **Slice 1 — lifecycle hooks (D3).** `onResolveConfig`, `onBuildStart`,
  `transformPage`, `onBuildComplete`. Thin, typed, no markdown-chain or security
  risk. Delivers the headline deploy hook (`onBuildComplete`). **(building now)**
- **Slice 2 — markdown plugin seam (B1a). DONE 2026-06-29.** `remarkPlugins` /
  `rehypePlugins` on a plugin. Remark plugins inject after the built-in remark
  chain / before `remarkRehype`; rehype plugins after `rehypeRaw` / *before*
  `rehypeSanitize` so sanitize stays the guard (verified: a rehype-injected
  `<script>` is stripped). Typed `unknown[]` in core + cli (neither imports
  `unified`); `@ovellum/site` casts to `PluggableList` at the `renderMarkdown`
  boundary. `run-build.ts` flattens across plugins in order → `buildSite`. Manual
  rendering only (auto/hybrid emit Markdown, not HTML).
- **Slice 3 — template overrides (B1b).** "Bring your own template directory"
  — override the hard-coded `templates/default/` (shell render + asset copy in
  `build.ts`/`template.ts`). Biggest blast radius; last.

## Slice 1 hook contract

All hooks optional, may be async, run in plugin array order. A hook that throws
fails the build with `[plugin: <name>] <hook> failed: …`.

- **`onResolveConfig(config) → OvellumConfig | void`** — fires once after the
  config is loaded + CLI overrides applied, before building. Returning a config
  replaces it for the rest of the build (chained across plugins). The plugin
  owns validity (not re-validated). Use: env-driven settings (e.g. set
  `site.baseUrl` from `process.env`).
- **`onBuildStart({ config, cwd, mode }) → void`** — observe; before any output.
- **`transformPage({ url, html, outputPath, frontmatter? }) → { html? } | void`**
  — per rendered **HTML page** (manual-mode site). Returning `{ html }` replaces
  the page body. Chained (each plugin sees the prior's html). Auto/hybrid
  Markdown transform is deferred (those outputs are `.md`, not pages).
- **`onBuildComplete({ outDir, manifest, cwd, mode }) → void`** — after the
  build (and after the manifest is written when `--manifest`). `outDir` is
  absolute; `manifest` is a `DeployManifest` **always computed when any plugin
  defines `onBuildComplete`** (so a deploy hook always has the inventory, even
  without `--manifest`). The literal deploy hook.

## Plumbing

Mirrors the existing `onLog` precedent: `run-build.ts` owns plugin orchestration
and composes resolved callbacks that flow into `buildSite` (manual) the same way
`onLog` does — the `@ovellum/site` package stays plugin-agnostic, receiving only
a resolved `transformPage?` callback, not the plugin array.

- Types live in **`@ovellum/core`** (`types/plugin.ts`): `OvellumPlugin` +
  context types. `DeployManifest`/`ManifestFile` move to `core` (`types/build.ts`)
  so the hook payload can reference them without a cli→core inversion. The
  manifest *writer* stays in cli; `manifest.ts` splits into `computeManifest`
  (pure) + `writeDeployManifest`.
- `OvellumConfig.plugins?: OvellumPlugin[]`; validated lightly (name string,
  each hook a function). `BuildOptions.plugins?` merges ahead of config plugins
  for programmatic embedders (the D2 API story).
- Exported from the `ovellum` package: `OvellumPlugin` + context types.
