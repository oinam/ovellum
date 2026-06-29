---
'ovellum': minor
---

Plugins — build lifecycle hooks (B1 slice 1 + D3). A new `config.plugins:
OvellumPlugin[]` extends the build with named units of lifecycle hooks, run in
order:

- `onResolveConfig(config)` — observe or replace the resolved config (e.g. set
  `site.baseUrl` from the environment); CLI `--out`/`--base` still win.
- `onBuildStart({ config, cwd, mode })` — before any output.
- `transformPage({ url, html, outputPath })` — rewrite each rendered HTML page
  of a manual-mode site before it's written.
- `onBuildComplete({ outDir, manifest })` — the deploy hook; `manifest` (the
  file inventory with hashes) is always computed when a plugin defines it, even
  without `--manifest`.

Plugins are functions, so they live in a TS/JS config (or pass them to the
programmatic API: `build({ plugins: [...] })`). A hook that throws fails the
build, attributed to the plugin by name. The `OvellumPlugin` type and the hook
context types are exported from the `ovellum` package; `DeployManifest` /
`ManifestFile` are now exported too. User-supplied remark/rehype plugins and
template overrides are planned follow-up slices.
