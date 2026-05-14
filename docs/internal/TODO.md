# TODO

Living checklist. Update in place as work progresses.
Last updated: 2026-05-13 (Phase 1 done)

Legend: `[ ]` not started · `[~]` in progress · `[x]` done · `[!]` blocked

---

## Phase 0 - Repository & Tooling Setup

- [x] Confirm project name (check npm availability: `ovellum`, `folia`, `meld`, `strata`)
- [x] Create GitHub repository (public, MIT license)
- [x] Initialize monorepo with `pnpm workspaces`
- [x] Set up Turborepo (`turbo.json` with `build`, `test`, `lint`, `typecheck` pipelines)
- [x] Add root `tsconfig.json` (strict mode, ESM, Node 20+)
- [x] Configure ESLint (`typescript-eslint` flat config + `eslint-config-prettier`)
- [x] Configure Prettier (`.prettierrc`)
- [x] Set up `changesets` for versioning and changelog
- [x] Add `.editorconfig`
- [x] Add `.nvmrc` / `.node-version` pinned to Node 20 LTS (Node 18 reached EOL in April 2025)
- [x] Create `packages/` directory stubs: `core`, `parser`, `generator`, `merger`, `reader`, `cli`
- [x] Scaffold each package with its own `package.json`, `tsconfig.json`, `src/index.ts`
- [x] Configure `tsup` build in each package
- [x] Wire up `pnpm build`, `pnpm test`, `pnpm typecheck` via Turborepo
- [x] Set up GitHub Actions: `ci.yml` (lint + typecheck + test + build on PR, matrix Node 20 + 22)
- [x] Set up GitHub Actions: `release.yml` (changesets publish on main merge)
- [x] Add issue templates: bug report, feature request
- [x] Add `PULL_REQUEST_TEMPLATE.md`
- [x] Write initial `CONTRIBUTING.md`
- [x] Write initial `README.md`
- [x] Add `LICENSE` (MIT)
- [x] Add `.gitignore` (node_modules, dist, `.ovellum/cache`, NOT `.ovellum/orphans`)

---

## Phase 1 - Core Types & Config (`@ovellum/core`)

- [x] Define all IR types (`DocNode`, `DocFile`, `DocProject`, `DocParam`, `DocReturn`) - see DESIGN.md §6
- [x] Define `OvellumConfig` type with full schema - see DESIGN.md §7
- [x] Define `ProtectedBlock` and `ManualDoc` types for merger
- [x] Define `OrphanRecord` type (metadata stored in quarantine files)
- [x] Implement `defineConfig()` helper (re-exports user config with type safety)
- [x] Implement config loader using `c12`
  - [x] Load `ovellum.config.ts` / `.js` / `.json` from project root
  - [x] Support per-directory config merging (child wins on conflict)
  - [x] Support frontmatter `ovellum:` block as per-file override
  - [x] Validate config against schema; throw descriptive errors on invalid input
  - [x] Apply defaults for all optional fields
- [x] Export `OvellumError` base class for typed error handling
- [x] Write unit tests for config loader (valid config, invalid config, defaults, merge)

> Phase 0 build note (encountered during Phase 1): tsup's `dts: true` rolls up
> declarations using its own pipeline and chokes on `composite: true` projects
> with multi-file imports (TS6307 "not listed within the file list of project").
> Resolved for `@ovellum/core` by switching its build to `tsup && tsc -b --force`
> with `emitDeclarationOnly: true` and `tsBuildInfoFile: "./dist/.tsbuildinfo"`.
> The `--force` flag is required because tsup's `clean: true` wipes the
> tsbuildinfo mid-build, leaving tsc unable to tell what changed. Other packages
> still ship the stock `tsup` build and will need the same change when they grow
> beyond a single source file.

---

## Phase 2 - Source Parser (`@ovellum/parser`)

- [ ] Install and configure `ts-morph`
- [ ] Set up project loader (accepts `tsconfig.json` path or inline compiler options)
- [ ] Implement file discovery (respects `include` / `exclude` globs from config)
- [ ] Implement symbol extractors:
  - [ ] `function` declarations (name, params, return type, generics, overloads, JSDoc)
  - [ ] `class` declarations (name, constructor, methods, properties, extends, implements, JSDoc)
  - [ ] `interface` declarations (name, members, extends, JSDoc)
  - [ ] `type` alias declarations (name, definition, JSDoc)
  - [ ] `enum` declarations (name, members with values, JSDoc)
  - [ ] `const` / `let` / `var` (exported only, unless `includeInternal`)
  - [ ] Module-level JSDoc (`@module` tag)
- [ ] Implement JSDoc tag parser:
  - [ ] `@param`, `@returns` / `@return`
  - [ ] `@throws` / `@exception`
  - [ ] `@example`
  - [ ] `@deprecated`
  - [ ] `@since`, `@see`
  - [ ] `@remarks`, `@description`
  - [ ] `@preserve` (flag on DocNode)
  - [ ] `@internal` (flag on DocNode)
  - [ ] Unknown tags → `tags` bag
- [ ] Implement anchor ID generator (`{relativeFilePath}::{symbolPath}`) - must be deterministic
- [ ] Implement export filter (respect `isExported`, `includeInternal`, `includePrivate` flags)
- [ ] Handle edge cases:
  - [ ] Re-exports and barrel files (warn on duplicates, deduplicate by anchor ID)
  - [ ] Circular imports (warn and continue; partial IR acceptable)
  - [ ] Overloaded functions (collapse to single DocNode with union signatures)
  - [ ] Namespace exports (warn; skip in v1)
  - [ ] `declare module` augmentations (warn; skip in v1)
- [ ] Return fully typed `DocProject` IR
- [ ] Write unit tests:
  - [ ] Each symbol type with all JSDoc tags
  - [ ] Exported vs. non-exported filtering
  - [ ] `@internal` / `@preserve` flags
  - [ ] Anchor ID stability
  - [ ] Overloads
  - [ ] Edge cases (re-exports, circular, empty file)

---

## Phase 3 - Markdown Generator (`@ovellum/generator`)

- [ ] Accept `DocProject` IR + config, return `Map<filePath, string>` (output path → Markdown content)
- [ ] Implement output path mapping (`src/utils/format.ts` → `docs/utils/format.md`)
- [ ] Implement per-file Markdown builder:
  - [ ] File-level frontmatter (`title`, `source`, `generated`, `ovellum: true`)
  - [ ] Module description (from `@module` JSDoc)
  - [ ] Section per exported symbol
- [ ] Implement per-symbol Markdown templates:
  - [ ] `function`: signature code block, description, params table, returns, throws, examples
  - [ ] `class`: signature, description, constructor, methods table, properties table
  - [ ] `interface`: signature, description, members table
  - [ ] `type`: definition code block, description
  - [ ] `enum`: members table with values
  - [ ] `variable`: type + description
- [ ] Implement `_index.md` / sidebar table of contents generator
- [ ] MDX output mode: emit `.mdx`, detect JSX in `@example` blocks, warn user
- [ ] Handle `@deprecated` symbols: add deprecation notice callout
- [ ] Handle `@since`: add "Since: vX.X" note
- [ ] Handle `@see`: add "See also" section with links
- [ ] Attach anchor comments to each section for merge engine targeting:
  - [ ] `<!-- ovellum:anchor id="{anchorId}" generated="{timestamp}" -->`
- [ ] Write unit tests:
  - [ ] Each symbol type → expected Markdown string (use snapshot-free explicit comparisons)
  - [ ] Frontmatter correctness
  - [ ] MDX mode
  - [ ] Deprecated symbols
  - [ ] TOC generation

---

## Phase 4 - Manual Doc Reader (`@ovellum/reader`)

- [ ] Install `unified`, `remark`, `remark-parse`, `remark-stringify`, `gray-matter`, `remark-mdx`
- [ ] Implement file reader: accepts a file path, returns `ManualDoc`
- [ ] Implement frontmatter extractor (using `gray-matter`)
- [ ] Implement protected zone extractor:
  - [ ] Find all `<!-- @manual:start -->` / `<!-- @manual:end -->` pairs
  - [ ] Extract `id` attribute if present; generate positional fallback if not (warn when fallback used)
  - [ ] Store: `{ id, content: string, startLine, endLine }`
  - [ ] Detect and error on unclosed tags
  - [ ] Detect and error on nested tags
- [ ] Implement anchor association: map each protected block to the nearest preceding `<!-- ovellum:anchor id="..." -->` comment
- [ ] Validate mode: in `manual` mode only, also run:
  - [ ] Internal link checker (relative `[text](./path.md)` links that resolve to nothing)
  - [ ] Missing required frontmatter fields (configurable list)
  - [ ] Malformed protected zone tags
- [ ] Return `ManualDoc` with full protected zone map
- [ ] Write unit tests:
  - [ ] Protected zone extraction (with ID, without ID)
  - [ ] Unclosed tag error
  - [ ] Nested tag error
  - [ ] Frontmatter parsing
  - [ ] Anchor association
  - [ ] Link validation (manual mode)

---

## Phase 5 - Merge Engine (`@ovellum/merger`)

- [ ] Implement `merge(generated: string, manual: ManualDoc): MergeResult`
- [ ] Parse generated content into sections keyed by anchor ID
- [ ] For each anchor section:
  - [ ] Look up anchor ID in `manual.protectedBlocks`
  - [ ] If found: splice protected block content into generated section at correct position
  - [ ] Mark block as "placed"
- [ ] Collect unplaced protected blocks → these are orphans
- [ ] Implement orphan handler:
  - [ ] Write `OrphanRecord` to `.ovellum/orphans/{YYYY-MM-DD}_{anchorId}.md`
  - [ ] Include full metadata header (source file, anchor ID, last seen timestamp, block ID)
  - [ ] Collect all orphan paths → return in `MergeResult.orphans[]`
- [ ] Implement `MergeResult`:
  ```typescript
  interface MergeResult {
    content: string;        // Final merged Markdown
    orphans: OrphanRecord[]; // Blocks that could not be placed
    warnings: string[];     // Non-fatal issues
  }
  ```
- [ ] Implement `ovellum orphans` subcommand:
  - [ ] List all files in `.ovellum/orphans/` with metadata
  - [ ] `--stale` flag: filter to orphans older than `orphanRetention` days
  - [ ] Interactive mode: reattach / delete / skip (use `@inquirer/prompts`)
- [ ] Handle `@preserve`-tagged source symbols:
  - [ ] Generator emits protected zone wrappers around `@preserve` content automatically
  - [ ] Merger treats them identically to `<!-- @manual:start -->` blocks
- [ ] Write unit tests:
  - [ ] Protected block survives regeneration
  - [ ] Protected block without ID (positional fallback)
  - [ ] Orphan is quarantined when anchor disappears
  - [ ] Orphan file has correct metadata
  - [ ] Multiple protected blocks per file
  - [ ] Merge output is valid Markdown
- [ ] Write integration tests (fixture-based - see Phase 7)

---

## Phase 6 - CLI (`ovellum`)

- [ ] Install `citty` for CLI framework
- [ ] Implement `ovellum build`:
  - [ ] Load config
  - [ ] Determine mode
  - [ ] Run appropriate pipeline (auto / manual / hybrid)
  - [ ] Print summary: N files written, N orphans quarantined, N warnings
  - [ ] Exit codes: 0 (success), 1 (error), 2 (strict warnings), 3 (config invalid)
- [ ] Implement `ovellum watch`:
  - [ ] Install `chokidar`
  - [ ] Watch source files, docs files, config file
  - [ ] Debounce (300ms)
  - [ ] Incremental rebuild (only affected files)
  - [ ] Print rebuild summary on each change
- [ ] Implement `ovellum check`:
  - [ ] Validate config
  - [ ] Run reader in validation mode (link check, frontmatter check)
  - [ ] List any orphans
  - [ ] Exit 0 if clean, 1 if issues found
- [ ] Implement `ovellum orphans`:
  - [ ] List mode (default)
  - [ ] `--stale` flag
  - [ ] Interactive reattach / delete (optional `--interactive` flag)
- [ ] Implement `ovellum init`:
  - [ ] Install `@inquirer/prompts`
  - [ ] Prompt: name, mode, input, output, format
  - [ ] Write `ovellum.config.ts`
  - [ ] Create output dir stub
  - [ ] Update `.gitignore`
  - [ ] Print next steps
- [ ] Implement `ovellum clean`:
  - [ ] Identify and remove auto-generated files (by `ovellum: true` frontmatter)
  - [ ] Preserve manual-only files
  - [ ] Dry-run mode by default; `--confirm` to actually delete
- [ ] Add `--strict` global flag
- [ ] Add `--config <path>` global flag (custom config path)
- [ ] Add `--verbose` global flag (debug output)
- [ ] Write unit tests for CLI argument parsing and exit codes
- [ ] Wire `bin.ovellum` in `packages/cli/package.json`

---

## Phase 7 - Integration Tests & Fixtures

- [ ] Set up integration test runner (Vitest, runs `ovellum build` via `execa` against fixtures)
- [ ] Create fixture: `auto-simple` - basic TS file, pure auto mode, verify output
- [ ] Create fixture: `manual-passthrough` - only .md files, manual mode, verify unchanged
- [ ] Create fixture: `hybrid-protected-survives` - protected zone intact after regeneration
- [ ] Create fixture: `hybrid-orphan-quarantine` - anchor deleted, block quarantined, file written
- [ ] Create fixture: `hybrid-no-id-fallback` - protected zone without `id`, positional fallback
- [ ] Create fixture: `hybrid-preserve-tag` - `@preserve` JSDoc tag in source
- [ ] Create fixture: `frontmatter-mode-override` - file uses `ovellum: { mode: manual }`
- [ ] Create fixture: `class-full` - class with constructor, methods, properties
- [ ] Create fixture: `interface-type-enum` - interface, type alias, enum
- [ ] Create fixture: `barrel-file` - re-exports, verify deduplication
- [ ] Create fixture: `deprecated-symbols` - `@deprecated` tags in output
- [ ] Create fixture: `mdx-output` - MDX format config
- [ ] Create fixture: `strict-mode` - orphans present, verify exit code 2
- [ ] All fixtures produce deterministic output (timestamps mocked in tests)

---

## Phase 8 - Documentation & Self-Hosting

- [ ] Write `README.md` (final): overview, install, quickstart, config reference, tagging guide
- [ ] Write `CONTRIBUTING.md` (final): dev setup, test instructions, PR process, release process
- [ ] Write `docs/` using O'Vellum itself (hybrid mode, self-documenting)
  - [ ] `docs/getting-started.md` (manual)
  - [ ] `docs/config.md` (manual)
  - [ ] `docs/tagging.md` (manual - the tagging spec)
  - [ ] `docs/api/` (auto-generated from `packages/*/src/`)
  - [ ] `docs/orphans.md` (manual - how to handle orphaned sections)
  - [ ] `docs/contributing.md` (manual)
- [ ] Verify `ovellum build` on itself produces clean output
- [ ] Add badge: CI status, npm version, license, coverage

---

## Phase 9 - Pre-release Polish

- [ ] Full lint pass across all packages
- [ ] Full typecheck with `--strict` across all packages
- [ ] Coverage report: all packages at 90%+ line coverage
- [ ] Run `ovellum check --strict` on own docs (exit 0)
- [ ] Review all `TODO`, `FIXME`, `HACK` comments in source - resolve or track as issues
- [ ] Run `npm pack` on CLI package - verify contents look correct
- [ ] Test `npx ovellum init` on a fresh TypeScript project (manual end-to-end)
- [ ] Test `npx ovellum build` in `auto`, `manual`, and `hybrid` modes on the examples/ projects
- [ ] Write GitHub release notes for v0.1.0
- [ ] Publish to npm as `0.1.0` (pre-release tag: `next`)
- [ ] Announce in relevant communities (note: open source launch strategy TBD)

---

## Backlog (Post-v1, not scheduled)

- [ ] Plugin API for custom IR transforms and output formats
- [ ] Static site renderer (the hosting platform)
- [ ] Python language support
- [ ] Go language support
- [ ] Rust language support
- [ ] `@ovellum-id` JSDoc tag for stable custom anchor IDs
- [ ] Per-symbol mode override via JSDoc tag
- [ ] Search index generation (Pagefind / Algolia)
- [ ] VS Code extension (protected zone highlighting, source navigation)
- [ ] GitHub App: auto-PR when docs drift from source
- [ ] `ovellum diff` command: show what would change without writing

---

## Open Questions

- [x] Confirm npm package name availability before Phase 0 is done
- [ ] Decide: should `ovellum clean` touch `.ovellum/orphans/`? (Probably not without explicit flag)
- [ ] Decide: should watch mode reload config on `ovellum.config.*` change, or require restart? (Lean: restart with message)
- [ ] Decide: what does `@preserve` on a class do - protect the whole class section, or just the class-level comment? (Lean: just the class-level comment block; individual method sections are independent)
- [ ] Decide: should generated output files be committed to version control or gitignored? (Lean: committed, so PRs show doc diffs - but make it configurable)