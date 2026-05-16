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
| [`build`](#ovellum-build) | done     | Run the configured pipeline (parse + generate + merge, or build a site). |
| [`check`](#ovellum-check) | done     | Validate config + check for broken internal links without writing.        |
| `watch`                   | deferred     | Rebuild on file changes. Tracked in [`TODO.md`](./TODO.md) Phase 6.      |
| `orphans`                 | deferred     | List / inspect / reattach quarantined manual blocks.                     |
| `init`                    | deferred     | Interactive scaffolder for `ovellum.config.ts` + first content.          |
| `clean`                   | deferred     | Remove auto-generated outputs while preserving manual files.             |

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

## Deferred subcommands

Scoped specs live in [`TODO.md`](./TODO.md) Phase 6. Short version:

### `ovellum watch` (deferred)

`chokidar`-driven rebuild on changes to source, content, or config. Debounce
300ms. Incremental: only affected files re-process.

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

### `ovellum orphans` (deferred)

Browse `.ovellum/orphans/`:

- default: list with metadata
- `--stale`: filter to orphans older than `protect.orphanRetention` days
- `--interactive`: reattach / delete / skip prompts (via `@inquirer/prompts`)

### `ovellum init` (deferred)

Interactive scaffolder. Prompts: name, mode, input, output, format. Writes
`ovellum.config.ts`, creates the output directory stub, updates `.gitignore`.

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
