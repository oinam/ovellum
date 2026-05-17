---
title: CLI reference
description: Every subcommand and flag in the `ovellum` CLI.
---

# CLI reference

`ovellum <subcommand> [flags]`

Run via `npx ovellum`, via the package binary after install, or via your
package manager's task runner.

## Subcommands

| Subcommand | Status    | Summary                                                                  |
| ---------- | --------- | ------------------------------------------------------------------------ |
| `init`     | available | Scaffold a new project (config + starter content + `.gitignore` entry).  |
| `build`    | available | Run the configured pipeline (parse + generate + merge, or build a site). |
| `check`    | available | Validate config + check for broken internal links + flag unsafe URLs.    |
| `watch`    | available | Build, then rebuild on every change under `input/` (debounced 300 ms).   |
| `orphans`  | planned   | List / inspect / reattach quarantined manual blocks.                     |
| `clean`    | planned   | Remove auto-generated outputs while preserving manual files.             |

## `ovellum init`

Scaffold a new project in the current (or given) directory. Refuses to
clobber an existing `ovellum.config.json` unless `--force` is passed.

### Synopsis

```
ovellum init [--cwd <dir>] [--yes] [--force]
```

### Flags

| Flag          | Type    | Default         | Notes                                                                                |
| ------------- | ------- | --------------- | ------------------------------------------------------------------------------------ |
| `--cwd <dir>` | path    | `process.cwd()` | Project root.                                                                        |
| `--yes`, `-y` | boolean | `false`         | Non-interactive: accept every default. Useful in CI / smoke tests.                   |
| `--force`     | boolean | `false`         | Overwrite an existing `ovellum.config.json`. By default the command exits with `2`. |

### Prompts (interactive)

1. **Project name** — defaults to `package.json#name` or the folder name.
2. **Mode** — `manual` (default), `auto`, or `hybrid`.
3. **Site title** — defaults to a title-cased project name.
4. **Description** — used for `<meta name="description">`.
5. (manual) **Content dir** / **Output dir** / **Generate landing page?**
6. (auto / hybrid) **`tsconfig`** / **Output dir**.
7. **Default theme** — `auto`, `light`, or `dark`.

### Output

Writes only files that don't already exist (unless `--force`):

- `ovellum.config.json`
- `<input>/index.md` (manual + hybrid modes only) with a friendly starter.
- `.gitignore` — appends `<output>/` and `.orphans/` if absent.

Prints a numbered next-steps list keyed to the chosen mode.

### Exit codes

| Code  | Meaning                                                                |
| ----- | ---------------------------------------------------------------------- |
| `0`   | Project initialised.                                                   |
| `2`   | `ovellum.config.json` already exists; re-run with `--force` to replace. |
| `130` | User cancelled the prompts (Ctrl-C).                                   |

## `ovellum build`

Resolves the project's `ovellum.config.*`, runs the configured pipeline,
writes output to disk, prints a summary.

### Synopsis

```
ovellum build [--cwd <dir>] [--config <path>]
```

### Flags

| Flag              | Type | Default         | Notes                                                           |
| ----------------- | ---- | --------------- | --------------------------------------------------------------- |
| `--cwd <dir>`     | path | `process.cwd()` | Project root. All paths in the config resolve relative to this. |
| `--config <path>` | path | auto-discovered | Skip discovery and load this file directly.                     |

### Behaviour by mode

#### `auto`

1. Parse `input/` to a `DocProject` IR.
2. Render IR to Markdown.
3. Write each output, overwriting any existing file.

#### `hybrid` (default)

Same as `auto`, then for each generated file:

1. If the existing output file is present, read it.
2. If it carries `<!-- @manual:start -->` blocks, run the merger.
3. Any block whose anchor no longer exists is written to `protect.orphanDir`.

#### `manual`

1. Walk `input/` for `.md` files.
2. Render each to HTML (Markdown is sanitised — see [Security](/reference/security/)).
3. Build a sidebar nav and breadcrumb trail.
4. Wrap each page in the default template (topbar, sidebar, ToC, prev/next, page meta).
5. Write pretty URLs to `output/`.
6. Copy `assets/ovellum.css` + `assets/ovellum.js` from the bundled template.
7. When `site.baseUrl` is set, emit `sitemap.xml`.
8. When `site.search.enabled` is `true`, run Pagefind against the output and emit `dist/pagefind/`.

### Summary output

#### Auto / hybrid

```
ovellum build complete in 207ms
  config:    .../ovellum.config.json
  mode:      hybrid
  sources:   2          ← input files parsed
  written:   2 file(s)  ← Markdown files written
  merged:    1 file(s)  ← hybrid only: files where a manual block was spliced
  orphans:   0          ← hybrid only: blocks whose anchor disappeared
  warnings:  0
    → docs/format.md
    → docs/user.md
  quarantined:          ← only printed when orphans > 0
    ↪ .ovellum/orphans/2026-05-15_src-format.ts-padZero.md
```

#### Manual

```
ovellum build complete in 207ms
  config:    .../ovellum.config.json
  mode:      manual
  output:    dist/
  pages:     5
  warnings:  0
    → /                       (dist/index.html)
    → /configuration/         (dist/configuration/index.html)
    → /getting-started/       (dist/getting-started/index.html)
    → /guides/deploying/      (dist/guides/deploying/index.html)
    → /guides/theming/        (dist/guides/theming/index.html)
```

### Exit codes

| Code | Meaning                                                     |
| ---- | ----------------------------------------------------------- |
| `0`  | Success.                                                    |
| `1`  | Build error (parser failure, write failure, unknown mode).  |
| `2`  | Reserved for `--strict` (warnings promoted to errors).      |
| `3`  | `ConfigError` — config schema invalid, file not found, etc. |

`stderr` carries per-warning lines (`warning: …`). `stdout` carries the summary.

### Examples

```bash
# Build from the current directory
npx ovellum build

# Build a different project
npx ovellum build --cwd ./website

# Bypass config discovery
npx ovellum build --config ./config/ovellum.prod.ts
```

## `ovellum check`

Validation pass only — no writes. Loads config, walks every `.md` file
under `input/`, extracts links via remark (so fenced code blocks are
correctly ignored), and verifies:

1. Every internal link resolves to a real page URL in the sidebar nav.
2. No link uses an unsafe URL scheme (`javascript:`, `vbscript:`, `data:`,
   `file:`). Even though `renderMarkdown` strips these at render time,
   `check` flags them here so authors can remove them at the source.

### Synopsis

```
ovellum check [--cwd <dir>] [--config <path>]
```

### Output

Clean:

```
ovellum check complete in 76ms
  config:    .../ovellum.config.json
  mode:      manual
  pages:     14
  broken links:    0
  unsafe schemes:  0
```

With issues:

```
ovellum check complete in 87ms
  config:    .../ovellum.config.json
  mode:      manual
  pages:     14
  broken links:    1
  unsafe schemes:  1
  details:
    content/getting-started.md:42   [SECURITY] unsafe URL scheme 'javascript:' — link will be stripped by the HTML sanitizer (raw: javascript:alert(1))
    content/getting-started.md:112  broken internal link to /no/such/page/ (raw: /no/such/page/)
```

### Exit codes

- `0` clean
- `1` one or more issues found
- `3` config invalid

### Scope today

Manual mode only. Hybrid and auto modes exit `1` with a "not yet
supported" message — broken-link coverage for the auto-generated half
of the pipeline is on the roadmap.

Frontmatter validation, required-fields checking, and orphan listing
for hybrid mode are deferred.

## `ovellum watch`

Build, then watch `input/` (and the config file) for changes and rebuild
on every change. Debounced at 300 ms with `chokidar`'s
`awaitWriteFinish` enabled so partial writes don't trigger a half-state
rebuild.

### Synopsis

```
ovellum watch [--cwd <dir>] [--config <path>]
```

### Behaviour

- An initial build runs once on start.
- Changes to any file under `input/` re-trigger the same pipeline.
- Changes to the **config file itself** reload it before the next build.
- `Ctrl-C` shuts the watcher down cleanly.

Live reload (auto-refreshing the browser) is not bundled yet; you re-press
refresh after the rebuild line appears in your terminal.

## Planned subcommands

### `ovellum orphans`

Browse `.ovellum/orphans/`:

- default: list with metadata
- `--stale`: filter to orphans older than `protect.orphanRetention` days
- `--interactive`: reattach / delete / skip prompts

### `ovellum clean`

Removes auto-generated files (identified by `ovellum: true` frontmatter)
while preserving manual files. Dry-run by default; `--confirm` actually
deletes. Does **not** touch `.ovellum/orphans/` (those are committed
manual writing).

## Global flags (planned)

| Flag        | Notes                                              |
| ----------- | -------------------------------------------------- |
| `--strict`  | Promote warnings to errors; exit `2`.              |
| `--verbose` | Print debug output (parser stages, merge details). |

`--cwd` and `--config` are available on `build`, `check`, and `watch`
today; they'll be promoted to global once more subcommands land.
