---
title: CLI reference
description: Every subcommand and flag in the `ovellum` CLI.
---

# CLI reference

`ovellum <subcommand> [flags]`

Run via `npx ovellum`, via the package binary after install, or via your
package manager's task runner.

## Subcommands

| Subcommand | Status    | Summary                                                         |
| ---------- | --------- | --------------------------------------------------------------- |
| `build`    | available | Run the configured pipeline.                                    |
| `watch`    | not yet   | Rebuild on file changes.                                        |
| `check`    | not yet   | Validate config + docs without writing.                         |
| `orphans`  | not yet   | List / inspect / reattach quarantined manual blocks.            |
| `init`     | not yet   | Interactive scaffolder for `ovellum.config.ts` + first content. |
| `clean`    | not yet   | Remove auto-generated outputs while preserving manual files.    |

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
2. Render each to HTML.
3. Build a sidebar nav.
4. Wrap each page in the default template.
5. Write pretty URLs to `output/`.
6. Copy `assets/ovellum.css` + `assets/ovellum.js` from the bundled template.

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

## Planned subcommands

### `ovellum watch`

`chokidar`-driven rebuild on changes to source, content, or config.
Debounce 300 ms. Incremental: only affected files re-process.

### `ovellum check`

Validation pass only — no writes. Loads config, runs the reader in
validation mode (link checking + required frontmatter), lists any
orphans. Exit `0` clean, `1` issues found.

### `ovellum orphans`

Browse `.ovellum/orphans/`:

- default: list with metadata
- `--stale`: filter to orphans older than `protect.orphanRetention` days
- `--interactive`: reattach / delete / skip prompts

### `ovellum init`

Interactive scaffolder. Prompts: name, mode, input, output, format.
Writes `ovellum.config.ts`, creates the output directory stub, updates
`.gitignore`.

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

`--cwd` and `--config` are available on `build` today; they'll be
promoted to global once more subcommands land.
