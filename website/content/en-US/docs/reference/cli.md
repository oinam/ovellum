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
| `diff`     | available | Compare current source against the last build's IR snapshot — preview what a rebuild would change. |
| `dev`      | available | Build, watch, serve, and live-reload connected browsers — the one-command dev loop. |
| `watch`    | available | Build, then rebuild on every change under `input/` (debounced 300 ms).   |
| `serve`    | available | Serve the built site over HTTP. No watch, no live reload.                |
| `check`    | available | Validate config + check for broken internal links + flag unsafe URLs.    |
| `upgrade`  | available | Check npm for a newer Ovellum and install it.                            |
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
| `0`   | Project initialized.                                                   |
| `2`   | `ovellum.config.json` already exists; re-run with `--force` to replace. |
| `130` | User canceled the prompts (Ctrl-C).                                   |

## `ovellum build`

Resolves the project's `ovellum.config.*`, runs the configured pipeline,
writes output to disk, prints a summary.

### Synopsis

```
ovellum build [--cwd <dir>] [--config <path>] [--drafts] [--out <dir>] [--base <path>] [--manifest]
```

### Flags

| Flag              | Type | Default         | Notes                                                           |
| ----------------- | ---- | --------------- | --------------------------------------------------------------- |
| `--cwd <dir>`     | path | `process.cwd()` | Project root. All paths in the config resolve relative to this. |
| `--config <path>` | path | auto-discovered | Skip discovery and load this file directly.                     |
| `--drafts`        | flag | off             | Include [draft](/docs/guides/drafts/) pages (normally excluded from a production build). |
| `--out <dir>`     | path | `output` config | **Override the output directory** for this build, without editing the config — point a CI/deploy pipeline at any folder (e.g. a repo's `/docs`). |
| `--base <path>`   | path | `site.basePath` | **Override the base path** the site is served from (e.g. `/docs`). Same effect as `site.basePath`, per-invocation. |
| `--manifest`      | flag | off             | Write `<output>/.ovellum/manifest.json` — a hashed inventory of every built file (path, bytes, sha256) so a deploy tool can push only what changed and verify completeness. |

### Behavior by mode

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
2. Render each to HTML (Markdown is sanitized — see [Security](/docs/reference/security/)).
3. Build a sidebar nav and breadcrumb trail.
4. Wrap each page in the default template (topbar, sidebar, ToC, prev/next, page meta).
5. Write pretty URLs to `output/`.
6. Copy `assets/ovellum.css` + `assets/ovellum.js` from the bundled template.
7. When `site.baseUrl` is set, emit `sitemap.xml` and `feed.xml`.
8. When `site.search.enabled` is `true`, run Pagefind against the output and emit `dist/pagefind/`.
9. Emit [AI-friendly output](/docs/reference/config/#ai) — `llms.txt`, per-page `.md` mirrors (and `llms-full.txt` if enabled). On by default; controlled by [`site.ai`](/docs/reference/config/#ai).

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
  ir:        .ovellum/ir.json   ← parsed IR snapshot, written every auto/hybrid build
```

Every auto/hybrid build also writes its parsed IR to `.ovellum/ir.json` at the
project root (beside `.ovellum/orphans/`) — a snapshot of the symbols, anchors,
and signatures it just read. It's build _state_, not deploy output, so it stays
at the project root regardless of `--out`, and `.ovellum/` is gitignored by the
default scaffold. It's the foundation for upcoming source-diff, rename
detection, and anchor last-seen tracking; you can also read it yourself for any
tooling that needs a structured view of your API surface.

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
  manifest:  dist/.ovellum/manifest.json   ← only with --manifest
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

# Deploy-anywhere: build into a repo's /docs folder with a deploy manifest
npx ovellum build --out ./docs --base /docs --manifest
```

## `ovellum diff`

Compare the **current source** against the IR snapshot written by the last
build (`.ovellum/ir.json`) and report what a rebuild would change — added,
removed, and changed symbols, plus which output docs they'd touch. Writes
nothing; it's a preview, not a build. Auto/hybrid only (manual builds parse no
source and keep no IR).

It matches symbols by their stable anchor id, so a rename shows up as a removed
symbol plus an added one (dedicated rename detection is a separate feature).
Cosmetic edits that only shift line numbers are ignored — a change is reported
only when the documented surface (signature, params, return, description,
deprecation, JSDoc tags, export/visibility) actually differs.

### Synopsis

```
ovellum diff [--cwd <dir>] [--config <path>] [--json] [--exit-code]
```

### Flags

| Flag           | Type    | Default         | Notes                                                                       |
| -------------- | ------- | --------------- | --------------------------------------------------------------------------- |
| `--cwd <dir>`  | path    | `process.cwd()` | Project root.                                                               |
| `--config <path>` | path | auto-discovered | Skip discovery and load this file directly.                                |
| `--json`       | boolean | `false`         | Emit the diff as JSON (`{ baselineGeneratedAt, added, removed, changed, docs, hasChanges }`) for CI / tooling. |
| `--exit-code`  | boolean | `false`         | Exit `1` when changes are found (git-diff style). Without it, `diff` always exits `0` so it can be run informationally. |

### Output

```
ovellum diff — current source vs .ovellum/ir.json (built 2026-06-24T17:58:46.322Z)

  + 1 added   - 0 removed   ~ 1 changed

added:
  + src/math.ts::mul  (function)

changed:
  ~ src/math.ts::add  (function)  signature, params

docs that would change:
  ~ docs/math.md  (+1 ~1 -0)
```

When nothing differs:

```
ovellum diff — no changes since the last build (.ovellum/ir.json, <timestamp>).
```

### Exit codes

| Code | Meaning                                                                       |
| ---- | ----------------------------------------------------------------------------- |
| `0`  | Success — no changes, or changes printed without `--exit-code`.                |
| `1`  | Changes found **with `--exit-code`**, or no/unreadable snapshot to compare.    |
| `3`  | `ConfigError` — config schema invalid, file not found, etc.                    |

### Example

```bash
# See what a rebuild would change
npx ovellum build           # records the baseline snapshot
# ...edit source...
npx ovellum diff            # preview the impact

# Fail CI if docs would drift from source
npx ovellum diff --exit-code
```

## `ovellum dev`

The combined build + watch + serve + live-reload loop. The one command
you want running while writing.

### Synopsis

```
ovellum dev [--cwd <dir>] [--config <path>] [--port <n>] [--host <addr>] [--no-drafts]
```

### Flags

| Flag              | Type    | Default     | Notes                                                                                |
| ----------------- | ------- | ----------- | ------------------------------------------------------------------------------------ |
| `--cwd <dir>`     | path    | `cwd`       | Project root.                                                                        |
| `--config <path>` | path    | auto        | Skip discovery and load this file directly.                                          |
| `--port <n>`      | integer | `3000`      | Starting port. If busy, auto-bumps up to 19 ports forward before giving up.          |
| `--host <addr>`   | string  | `127.0.0.1` | Bind address. Pass `0.0.0.0` to expose on the local network.                         |
| `--no-drafts`     | flag    | drafts on   | Hide [draft](/docs/guides/drafts/) pages locally, to preview exactly what production publishes. (`watch` takes `--no-drafts` too.) |

### Behavior

1. Loads the config and resolves `config.output` (the build's `dist/` dir).
2. Starts an HTTP server bound to `--host:--port`.
3. Runs an initial build, then watches `input/` and the config file for
   changes (same debounce as `ovellum watch` — 300 ms).
4. On every successful rebuild, pushes a `reload` event over
   Server-Sent Events to every connected browser tab; the injected
   client script calls `location.reload()`.
5. `Ctrl-C` shuts down both the watcher and the server cleanly.

The injected reload script is added only for HTML responses, only when
`dev` is the running command. `ovellum build` output is never modified.

### Output

```
ovellum dev starting from .../ovellum.config.json
built 17 page(s) in 720ms

watching content for changes…
local:   http://127.0.0.1:3000/
press Ctrl-C to exit.
```

After a save:

```
changed: content/getting-started.md
built 17 page(s) in 60ms
```

### Exit codes

| Code | Meaning                                                            |
| ---- | ------------------------------------------------------------------ |
| `0`  | Clean shutdown (Ctrl-C).                                           |
| `1`  | Mode unsupported. `dev` is manual-only because auto/hybrid produce `.md`, not browsable HTML. Use `ovellum watch` for those modes. |
| `3`  | Config invalid.                                                    |

### Examples

```bash
# Default: localhost:3000
npx ovellum dev

# Pick a port
npx ovellum dev --port 4000

# Expose to the LAN (useful for mobile testing)
npx ovellum dev --host 0.0.0.0

# Multi-site monorepo
npx ovellum dev --cwd ./website
```

## `ovellum serve`

Pure static-file server, no watching. Useful for previewing a
production build exactly as it'll be served, or wiring into a process
manager that handles rebuilds elsewhere.

### Synopsis

```
ovellum serve [--cwd <dir>] [--config <path>] [--port <n>] [--host <addr>]
```

Flags are identical to `ovellum dev`. The server reads from
`config.output`; if that directory doesn't exist, `serve` exits with
`1` and points you at `ovellum build` or `ovellum dev`.

### Differences vs. `ovellum dev`

| | `dev` | `serve` |
|---|---|---|
| Initial build | yes (via watcher) | no — requires existing `dist/` |
| Watches files | yes | no |
| Injects reload script | yes | no |
| Cache headers | `no-store` | `public, max-age=0` |

If you only want the server (e.g. you're running `ovellum watch` in
another shell yourself), `serve` is the right command.

## `ovellum check`

Validation pass only — no writes. Loads config, walks every `.md` file
under `input/`, extracts links via remark (so fenced code blocks are
correctly ignored), and verifies:

1. Every internal link resolves to a real page URL in the sidebar nav.
2. No link uses an unsafe URL scheme (`javascript:`, `vbscript:`, `data:`,
   `file:`). Even though `renderMarkdown` strips these at render time,
   `check` flags them here so authors can remove them at the source.
3. On i18n sites (two or more `site.locales`), translations are in sync with
   their source page — see [Translation staleness](#translation-staleness).

### Synopsis

```
ovellum check [--cwd <dir>] [--config <path>] [--update-translations]
```

### Flags

| Flag                     | Type    | Default | Notes                                                                                         |
| ------------------------ | ------- | ------- | --------------------------------------------------------------------------------------------- |
| `--cwd`                  | string  | cwd     | Project root.                                                                                  |
| `--config`               | string  | —       | Path to `ovellum.config.{ts,js,json}`.                                                         |
| `--update-translations`  | boolean | `false` | Stamp each translated page's `sourceHash` to the current source, then exit. See below.        |

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

### Behavior by mode

**Manual mode** — walks `input/` for `.md` files and validates every
internal link against the sidebar nav. On i18n sites this runs **per-locale**:
each `content/<code>/` subtree builds its own locale-prefixed nav, and links are
checked against the union of all locales' URLs — so a `/ja/…` link, a
cross-locale `/docs/…` link to the default locale, and relative links all
resolve correctly.

**Hybrid / auto mode** — walks the **output** directory (the
auto-generated Markdown), validates every internal link against the
actual files on disk, and flags unsafe URL schemes the same way.
If the output dir doesn't exist, `check` exits `1` with a hint to
run `ovellum build` first.

Frontmatter validation, required-fields checking, and orphan listing
for hybrid mode are deferred.

### Translation staleness

On a site with two or more `site.locales`, `check` also verifies that each
translated page is in sync with the default-locale page it mirrors (matched by
identical path across the locale folders). Each translation carries a
`sourceHash` in its frontmatter — a fingerprint of the source page's **body**
(frontmatter excluded, line endings normalized). `check` recomputes it and
reports, tagged `[i18n]`:

- a translation whose source **changed** since it was stamped (stale);
- a translation **missing** its `sourceHash` (never stamped);
- a translation with **no matching source** page (orphan).

Any of these counts as an issue, so `check` exits `1` — CI catches drift. To
stamp (or re-stamp) the hashes after syncing a translation, run:

```
ovellum check --update-translations
```

It writes the current `sourceHash` into every translated page — touching only
that one frontmatter line — and exits `0`. See the
[i18n guide](/docs/guides/i18n/#keeping-translations-in-sync) for the workflow.

## `ovellum watch`

Build, then watch `input/` (and the config file) for changes and rebuild
on every change. Debounced at 300 ms with `chokidar`'s
`awaitWriteFinish` enabled so partial writes don't trigger a half-state
rebuild. Works in every mode (manual, hybrid, auto) — the watcher
dispatches to the right build path automatically.

For the common "rebuild + serve + auto-refresh" loop (manual mode), you
almost certainly want [`ovellum dev`](#ovellum-dev) instead. `watch` is
the primitive — useful when you want to run a different server (a CDN
emulator, a reverse proxy, your own process manager), pipe build
notifications somewhere, or you're in auto / hybrid mode (no HTML to
live-reload, just regenerated Markdown).

### Synopsis

```
ovellum watch [--cwd <dir>] [--config <path>]
```

### Behavior

- An initial build runs once on start.
- Changes to any file under `input/` re-trigger the same pipeline.
- Changes to the **config file itself** reload it before the next build.
- `Ctrl-C` shuts the watcher down cleanly.

No HTTP server, no live reload — pair with `ovellum serve` in another
terminal, or hit a different static server of your choice.

## `ovellum upgrade`

Check the npm registry for a newer published `ovellum` and install it. The
command detects how Ovellum was installed (global vs. a local
devDependency, and which package manager) and runs the matching install
command.

It **prefers the project's local dependency**: when the current directory's
`package.json` declares `ovellum` (or it's already in `node_modules`), the
upgrade targets the project (`… add -D ovellum@latest`) even when invoked as the
global binary — and the package manager is read from the project's lockfile.
Only outside such a project does it fall back to a global install. The printed
line names the target, e.g. `Update available: 0.10.0 → 0.10.1 (this project's
local dependency).`

### Synopsis

```
ovellum upgrade [--dry-run] [--yes]
```

### Flags

| Flag        | Type    | Default | Notes                                                          |
| ----------- | ------- | ------- | -------------------------------------------------------------- |
| `--dry-run` | boolean | `false` | Print the upgrade command without running it.                  |
| `--yes, -y` | boolean | `false` | Skip the confirmation prompt and run immediately.              |

### Behavior

- If you're already on the latest version, it says so and exits `0`.
- Otherwise it prints `current → latest` and the exact install command.
- Interactively, it confirms before running (defaults to yes). With
  `--yes` it runs without asking; with `--dry-run` it only prints.
- In a **non-interactive** shell (no TTY) without `--yes`, it prints the
  command and exits without running — it never silently mutates your
  environment in CI or scripts.
- The install runs in a subprocess with inherited output; `ovellum
  upgrade` exits with that process's exit code.

### Update notice

Independently of this command, Ovellum prints a one-line **"update
available"** notice after a command finishes when a newer version exists.
It's a courtesy only — nothing is installed without `ovellum upgrade`. The
check:

- hits npm at most once per `update.intervalHours` (default 24h); the
  result is cached, so most runs do no network I/O;
- is **silent** in CI, in non-interactive shells, when `NO_UPDATE_NOTIFIER`
  is set, when `--no-update-check` is passed, and when
  [`update.check`](/docs/reference/config/#update) is `false`;
- never delays or fails a command — every error path is swallowed.

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
