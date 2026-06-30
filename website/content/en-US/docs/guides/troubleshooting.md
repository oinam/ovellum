---
title: Troubleshooting
description: Fixes for the common snags — zones not merging, unbalanced @manual tags, config not loading, broken asset paths, and recovering quarantined prose.
---

# Troubleshooting

The problems people actually hit, with the cause and the fix. Most surface as a
clear CLI message — this page explains what each one means.

## Protected zones aren't merging

In [hybrid mode](/docs/guides/hybrid-mode/), hand-written prose only survives a
rebuild when it's inside a **`@manual` zone** keyed to a generated anchor:

```markdown
<!-- @manual:start id="src/utils/format.ts::padZero" -->
Your prose here — kept verbatim across every rebuild.
<!-- @manual:end -->
```

- **No `id`?** Without `id="…"`, Ovellum synthesizes a positional fallback and
  warns:
  `protected zone "manual-block-1" uses a positional fallback id. Add id="…" on
  the <!-- @manual:start --> tag so the block survives reordering.` The block
  still merges, but it's tied to its *position*, not a symbol — add the `id` so
  reordering the file doesn't move your prose onto the wrong section. The `id`
  matches the anchor comment the generator emits:
  `<!-- ovellum:anchor id="src/utils/format.ts::padZero" … -->` (the format is
  `<sourceFile>::<symbol>`).

- **`ovellum check --strict`** reports id-less zones as `positional-zone` and
  zones whose anchor no longer exists as `stale-anchor`, so you can catch both
  in CI before they bite.

### Unbalanced `@manual` tags

These are hard errors (the build stops with [exit code 3](#exit-codes)):

| Message | Cause |
| ------- | ----- |
| `Nested @manual:start tag at line N (previous opened at line M).` | A second `@manual:start` before closing the first. |
| `Stray @manual:end at line N: no matching @manual:start.` | An `@manual:end` with no opener above it. |
| `Unclosed @manual:start at line N.` | A zone that's never closed — add a matching `<!-- @manual:end -->`. |

Every `@manual:start` needs exactly one `@manual:end`, and zones can't nest.

## My prose disappeared after a rebuild (orphans)

It didn't — it was **quarantined**, not dropped. When the symbol a zone was
attached to is renamed or deleted, its anchor vanishes, so the merger moves the
prose to `.ovellum/orphans/` (the `protect.orphanDir`) rather than lose it. The
build summary lists it under `quarantined:` with a `↪ <path>` line.

Recover it:

```sh
ovellum orphans                 # list quarantined prose + whether its anchor is back
ovellum orphans --stale         # only those older than protect.orphanRetention (default 90 days)
ovellum orphans --reattach      # interactively reattach, delete, or skip each
```

`ovellum orphans` shows each block's source doc, age, and **anchor status** —
`present again in source — reattachable`, `gone from current source`, or
`unknown (no IR snapshot — run ovellum build)`. The status is read from the
`.ovellum/ir.json` snapshot a build writes, so run a build first if it says
*unknown*.

`--reattach` is interactive (run it in a terminal). For each orphan it offers to
reattach to the anchor that's **back in the source** (or a likely **rename**, by
name similarity), reattach to a different anchor, delete, or skip. Reattaching
splices the prose into a fresh `@manual` zone under the target and removes the
archive. [`ovellum diff`](/docs/reference/cli/#ovellum-diff) is the companion
that flags likely renames.

## My config isn't being used

A few things to check:

- **Wrong place / name.** The file must be `ovellum.config.{ts,mts,cts,js,mjs,cjs,json}`
  at the project root (discovery is via [c12](https://github.com/unjs/c12)). A
  **missing config is not an error** — Ovellum falls back to built-in defaults
  and the build summary prints `config: (defaults)`. If you see that line, your
  file wasn't found. Pass `--config <path>` to point at it explicitly, or
  `--cwd <dir>` if you're running from elsewhere.

- **Invalid config** stops the build with `config error: …` and
  [exit code 3](#exit-codes) — e.g. `` `mode` must be one of: hybrid, manual,
  auto. `` The message names the offending field; fix it and rebuild.

- **`import { defineConfig } from 'ovellum'` fails to resolve.** A value import
  needs the `ovellum` package installed where the config loads. The scaffolded
  config deliberately avoids that — it uses
  `import type { OvellumUserConfig } from 'ovellum'` plus
  `export default { … } satisfies OvellumUserConfig`, which is erased at load so
  the file has no runtime dependency. Either install `ovellum` locally, or use
  the `import type` + `satisfies` form.

## Images or links are broken on the built site

Almost always a **relative path**. Pages get pretty URLs
(`guides/install.md` → `/guides/install/`), so a relative `architecture.svg`
resolves against `/guides/install/`, not the folder the file lives in. **Use
root-absolute paths:**

```markdown
![Architecture](/guides/architecture.svg)   <!-- ✓ always resolves -->
![Architecture](architecture.svg)            <!-- ✗ resolves against the page URL -->
```

Other asset gotchas:

- **`site.basePath`** must start with `/` and have **no trailing slash**
  (`'/ovellum'`). It's prepended to every internal link + asset path at render
  time, so you keep authoring root-relative links. A bad value fails validation:
  `` `site.basePath` must start with `/` … or be the empty string. ``
- **`public/` maps to the site root** — `public/favicon.ico` → `/favicon.ico`.
  Reference those at the root, without the `public/` prefix.
- **`ovellum check` validates page links, not asset URLs.** Images and downloads
  point at files, not pages, so confirm them with a local `ovellum serve` (or
  `ovellum dev`). See [Assets](/docs/guides/assets/).
- Using a CDN? [`site.assetBaseUrl`](/docs/guides/assets/#serving-public-from-a-cdn)
  rewrites `public/` references — but **not** query-stringed or `srcset` URLs;
  reference those by their final CDN URL.

## `ovellum dev` says it only supports manual mode

It does — `dev` is the manual-mode live-preview loop. For **auto/hybrid**, run
`ovellum watch` (rebuilds the Markdown on every change) and serve the output
yourself, or just `ovellum build`. The message spells out the alternative.

## Exit codes

Stable across commands, so CI can branch on them:

| Code | Meaning |
| ---- | ------- |
| `0` | Success — built, or `check`/`diff` found nothing. |
| `1` | Issues found (`check` broken links, `diff --exit-code` changes) or a build error. |
| `2` | `ovellum init` — config already exists; re-run with `--force`. |
| `3` | `ConfigError` — config invalid or failed to load. |
| `130` | Canceled at an interactive prompt (Ctrl-C). |

In `--json` mode a `ConfigError` is emitted on stdout as
`{ "ok": false, "error", "hint" }` — see [Automation](/docs/guides/automation/).

## Still stuck?

Run the command with `--verbose` for the config-resolution path and per-stage
detail (it goes to stderr, so it composes with `--json`), and check the
[CLI reference](/docs/reference/cli/) for the full flag set. If it looks like a
bug, [open an issue](https://github.com/oinam/ovellum/issues).
