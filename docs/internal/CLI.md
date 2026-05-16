# Ovellum - CLI Reference

Every subcommand and flag in the `ovellum` CLI. Updated in the same commit
as any CLI change.

Companion docs: [`FEATURES.md`](./FEATURES.md) for what each command exercises,
[`CONFIG.md`](./CONFIG.md) for what the config file controls,
[`GLOSSARY.md`](./GLOSSARY.md) for terminology.

Last updated: 2026-05-16

---

## Invocation

```
ovellum <subcommand> [flags]
```

The `ovellum` binary is `packages/cli/dist/index.js`. Installed via
`npm i -D ovellum` or run via `npx ovellum`. During development:

```
node packages/cli/dist/index.js <subcommand>
```

`pnpm -w run demo` and `pnpm -w run demo:site` invoke the binary against the
two fixture projects.

---

## Subcommands

| Subcommand                | Status | Summary                                                                  |
| ------------------------- | ------ | ------------------------------------------------------------------------ |
| [`init`](#ovellum-init)   | done     | Interactive scaffolder for `ovellum.config.json` + first content.        |
| [`build`](#ovellum-build) | done     | Run the configured pipeline (parse + generate + merge, or build a site). |
| [`check`](#ovellum-check) | done     | Validate config + check for broken internal links without writing.        |
| [`watch`](#ovellum-watch) | done     | Build, then rebuild on every change under `input/` (debounced 300 ms).    |
| `orphans`                 | deferred | List / inspect / reattach quarantined manual blocks.                     |
| `clean`                   | deferred | Remove auto-generated outputs while preserving manual files.             |

---

## `ovellum build`

Resolves the project's `ovellum.config.*`, runs the configured pipeline,
writes output to disk, prints a summary.

### Synopsis

```
ovellum build [--cwd <dir>] [--config <path>]
```

### Flags

| Flag              | Type | Default         | Notes                                                                 |
| ----------------- | ---- | --------------- | --------------------------------------------------------------------- |
| `--cwd <dir>`     | path | `process.cwd()` | Project root. All other paths in the config resolve relative to this. |
| `--config <path>` | path | auto-discovered | Skip discovery and load this file directly.                           |

### Behavior by mode

The config's `mode` field (see [`CONFIG.md` §1](./CONFIG.md#1-top-level-fields))
chooses the pipeline:

#### `auto`

1. Parse `input/` with `@ovellum/parser` → `DocProject` IR.
2. Render IR with `@ovellum/generator` → `Map<outputPath, markdown>`.
3. Write each output, overwriting any existing file.

#### `hybrid` (default)

Same as `auto`, then for each generated file:

1. If the existing output file is present, read it with `@ovellum/reader`.
2. If it carries `<!-- @manual:start -->` blocks, run `@ovellum/merger` to
   splice them back into the generated content.
3. Any block whose anchor no longer exists becomes an `OrphanRecord`,
   written to `protect.orphanDir` (default `.ovellum/orphans/`).

#### `manual`

1. Walk `input/` for `.md` files.
2. Render each to HTML with `@ovellum/site` (remark + rehype + shiki).
3. Build a sidebar nav from the file tree (honoring per-dir `_meta.json`).
4. Wrap each page in the default template.
5. Write pretty URLs (`name/index.html`) to `output/`.
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
  orphans:   0          ← hybrid only: protected blocks whose anchor disappeared
  warnings:  0
    → docs/format.md
    → docs/user.md
  quarantined:           ← only printed when orphans > 0
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
| `2`  | Reserved for `--strict` (warnings promoted to errors). deferred   |
| `3`  | `ConfigError` — config schema invalid, file not found, etc. |

`stderr` carries per-warning lines (`warning: …`). `stdout` carries the summary.

### Examples

```bash
# Build from the current directory
ovellum build

# Build a different project
ovellum build --cwd ./examples/manual-site

# Bypass config discovery
ovellum build --config ./config/ovellum.prod.ts
```

---

## Other subcommands

### `ovellum check`

Validation pass only — no writes. Loads config, walks every `.md` file
under `input/`, extracts links via remark (so fenced code blocks are
correctly ignored), and verifies every internal link resolves to a real
page URL in the sidebar nav.

```
ovellum check [--cwd <dir>] [--config <path>]
```

#### Output

Clean:

```
ovellum check complete in 76ms
  config:    .../ovellum.config.json
  mode:      manual
  pages:     14
  issues:    0
```

With broken links:

```
ovellum check complete in 87ms
  config:    .../ovellum.config.json
  mode:      manual
  pages:     14
  issues:    1
  details:
    content/getting-started.md:112  broken internal link to /no/such/page/ (raw: /no/such/page/)
```

#### Exit codes

- `0` clean
- `1` one or more issues found
- `3` config invalid

#### Scope today

Manual mode only. Hybrid and auto modes exit `1` with a "not yet
supported" message — broken-link coverage for the auto-generated half
of the pipeline is tracked in TODO.md Phase 6.

Frontmatter validation, required-fields checking, and orphan listing
for hybrid mode are deferred.

### `ovellum watch`

Builds once, then rebuilds on every change under `input/` or to the
config file itself. Debounced 300 ms so a single editor save doesn't
trigger two builds.

```
ovellum watch [--cwd <dir>] [--config <path>]
```

Watches via `chokidar`:

- `input/` (entire tree, including `_landing.md` and `_meta.json` files
  used by the build).
- The resolved `ovellum.config.*` file itself; touched configs reload
  before the next rebuild.

The watcher doesn't run its own dev server in v1. Pair it with anything
that serves a static directory:

```bash
# terminal 1
ovellum watch

# terminal 2
npx serve dist
```

On every rebuild the summary prints to stdout; warnings (if any) go to
stderr. `Ctrl-C` shuts the watcher down cleanly.

#### Scope today

Manual mode only. Live-reload (browser auto-refresh) is deferred; you
re-press the browser refresh button after a rebuild logs in the
terminal.

### `ovellum orphans` (deferred)

Browse `.ovellum/orphans/`:

- default: list with metadata
- `--stale`: filter to orphans older than `protect.orphanRetention` days
- `--interactive`: reattach / delete / skip prompts (via `@inquirer/prompts`)

## `ovellum init`

Scaffold a new project in the current (or given) directory. Refuses to
clobber an existing `ovellum.config.json` unless `--force` is passed.

### Synopsis

```
ovellum init [--cwd <dir>] [--yes] [--force]
```

### Flags

| Flag           | Type    | Default         | Notes                                                                                |
| -------------- | ------- | --------------- | ------------------------------------------------------------------------------------ |
| `--cwd <dir>`  | path    | `process.cwd()` | Project root.                                                                        |
| `--yes`, `-y`  | boolean | `false`         | Non-interactive: accept every default. Useful in CI / smoke tests.                   |
| `--force`      | boolean | `false`         | Overwrite an existing `ovellum.config.json`. By default the command exits with `2`. |

### Prompts (interactive)

1. **Project name** — defaults to `package.json#name` or the folder name.
2. **Mode** — `manual` (default), `auto`, or `hybrid`.
3. **Site title** — defaults to title-cased project name.
4. **Description** — used for `<meta name="description">`.
5. (manual) **Content dir** / **Output dir** / **Landing page?**
6. (auto / hybrid) **`tsconfig`** / **Output dir**.
7. **Default theme** — `auto`, `light`, or `dark`.

### Output

Writes only files that don't already exist (unless `--force`):

- `ovellum.config.json`
- `<input>/index.md` (manual + hybrid modes only) with a friendly starter.
- `.gitignore` — appends `<output>/` and `.orphans/` if absent.

Prints a numbered next-steps list keyed to the chosen mode.

### Exit codes

| Code | Meaning                                                                |
| ---- | ---------------------------------------------------------------------- |
| `0`  | Project initialised.                                                   |
| `2`  | `ovellum.config.json` already exists; re-run with `--force` to replace. |
| `130`| User cancelled the prompts (Ctrl-C).                                   |

### `ovellum clean` (deferred)

Removes auto-generated files (identified by `ovellum: true` frontmatter)
while preserving manual files. Dry-run by default; `--confirm` actually
deletes. Does **not** touch `.ovellum/orphans/` (those are committed manual
writing).

---

## Global flags (planned)

| Flag                | Status        | Notes                                                  |
| ------------------- | ------------- | ------------------------------------------------------ |
| `--strict`          | deferred            | Promote warnings to errors; exit `2`.                  |
| `--verbose`         | deferred            | Print debug output (parser stages, merge details).     |
| `--cwd`, `--config` | done (on `build`) | Will be promoted to global when more subcommands land. |
