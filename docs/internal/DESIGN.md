# O’Vellum - Design & Architecture

## 1. Vision & Philosophy

O’Vellum is a documentation tool for TypeScript and JavaScript projects that treats documentation as a living, collaborative artifact - not a one-time export or a separate parallel universe.

Most documentation tools force a choice: either you auto-generate from code (and lose narrative voice), or you hand-write everything (and it drifts from reality). O’Vellum refuses that tradeoff and lets auto-generated content and manually written content live in the same file, governed by a tagging contract that both the tool and the human author respect.

**Core principles:**

- **Markdown is the source of truth.** `.md` files are the primary format. `.mdx` is supported. No proprietary formats, no vendor lock-in.
- **Three modes, one tool.** `hybrid` (default), `manual`, and `auto` - selectable per project or per file.
- **The merge engine is the product.** Auto-generation and static site generation are solved problems. The novel value is the merge layer.
- **Orphaned content is never silently lost.** When an auto-documented anchor disappears, manually-written sections tied to it are quarantined, versioned, and surfaced - never deleted.
- **Open source from day one.** Code quality, test coverage, and contributor experience are first-class concerns.

---

## 2. Modes

### `hybrid` (default)
Auto-generates documentation from TypeScript/JavaScript source, then merges it with existing Markdown files. Protected zones (tagged by the author) survive regeneration intact. Untagged content in existing docs is treated as previously auto-generated and may be replaced.

### `manual`
The tool acts as a static documentation site builder only. It reads `.md` and `.mdx` files, validates structure, and renders output. No source parsing occurs. Equivalent to Retype or Docsify in behavior.

### `auto`
Full auto-generation from source with no manual content layer. Existing docs are fully replaced on each run. No merge engine involved. Equivalent to TypeDoc in behavior.

Mode can be set globally in config or overridden per-directory or per-file via frontmatter.

---

## 3. Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                        CLI Layer                         │
│              ovellum build / watch / check              │
└────────────────────────┬────────────────────────────────┘
                         │
              ┌──────────▼──────────┐
              │    Config Loader    │
              │  (ovellum.config)  │
              └──────────┬──────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
   ┌─────▼──────┐ ┌──────▼──────┐ ┌────▼──────────┐
   │   Source   │ │   Manual    │ │  Orphan Store  │
   │   Parser   │ │ Doc Reader  │ │  (.ovellum/)  │
   │ (ts-morph) │ │ (remark)    │ │               │
   └─────┬──────┘ └──────┬──────┘ └────┬──────────┘
         │               │              │
         └───────┬────────┘              │
                 │                       │
         ┌───────▼───────┐              │
         │  Merge Engine  ◄─────────────┘
         │  (hybrid mode) │
         └───────┬────────┘
                 │
         ┌───────▼───────┐
         │ Output Writer  │
         │ (.md / .mdx)   │
         └───────────────┘
```

In `manual` mode: Source Parser is bypassed entirely.
In `auto` mode: Manual Doc Reader and Merge Engine are bypassed.

---

## 4. Monorepo Package Structure

```
ovellum/
├── packages/
│   ├── core/               # Shared types, IR definitions, utilities
│   ├── parser/             # TS/JS AST → Intermediate Representation
│   ├── generator/          # IR → Markdown strings
│   ├── merger/             # Merge engine: protected zones + orphan logic
│   ├── reader/             # Markdown/MDX file reader + frontmatter parser
│   └── cli/                # CLI entry point (bin/ovellum)
│
├── tests/
│   ├── unit/               # Per-package unit tests
│   ├── integration/        # End-to-end fixture-based tests
│   └── fixtures/           # Sample TS/JS projects + expected outputs
│
├── docs/                   # Self-hosted: O’Vellum documents itself
│   └── internal/           # Planning documents (DESIGN.md, TODO.md)
├── examples/               # Example projects (simple-ts, api-server, mixed)
│
├── .ovellum/              # Runtime: orphan archive, cache, metadata
│   └── orphans/            # Quarantined orphaned manual sections
│
├── pnpm-workspace.yaml
├── turbo.json
├── ovellum.config.ts      # Self-referential config for docs/
└── CONTRIBUTING.md
```

All packages are internal (`@ovellum/core`, `@ovellum/parser`, etc.) except `ovellum` (the CLI) which is the single public npm package.

---

## 5. Tech Stack

| Concern | Choice | Reason |
|---|---|---|
| Language | TypeScript 5.x | Throughout; strict mode always on |
| Monorepo | pnpm workspaces + Turborepo | Fast, cache-aware builds; industry standard |
| AST Parsing | `ts-morph` | Friendly wrapper over TS compiler API; full type information |
| Markdown | `unified` + `remark` ecosystem | Best-in-class; composable; powers MDX |
| MDX | `remark-mdx` | Extends remark; keeps the pipeline unified |
| Config | `c12` (unjs) | Supports `.ts` config files; env merging; sane defaults |
| CLI | `citty` (unjs) | Lightweight; TypeScript-native; no magic |
| Testing | `vitest` | Fast; ESM-native; compatible with the TS stack |
| Linting | `eslint` + `@typescript-eslint` | Standard; extendable |
| Formatting | `prettier` | Non-negotiable for open source; format on commit |
| Build | `tsup` | Zero-config; outputs CJS + ESM |
| Releases | `changesets` | Changelog generation + versioning for monorepos |
| CI | GitHub Actions | Standard for open source |

**Intentionally NOT included in v1:**
- A renderer / static site engine (hosting platform is future scope)
- Multi-language support (Python, Go, Rust, etc.)
- GUI / web dashboard
- Plugin system (design for it; don't build it yet)

---

## 6. Intermediate Representation (IR)

The parser outputs a language-agnostic IR that the generator consumes. This decouples parsing from rendering and makes future language support a contained addition.

```typescript
// packages/core/src/types/ir.ts

export type DocKind =
  | 'function'
  | 'class'
  | 'interface'
  | 'type'
  | 'enum'
  | 'variable'
  | 'method'
  | 'property';

export interface DocParam {
  name: string;
  type: string;
  description?: string;
  optional: boolean;
  defaultValue?: string;
}

export interface DocReturn {
  type: string;
  description?: string;
}

export interface DocNode {
  id: string;              // Stable anchor ID: "src/utils/format.ts::formatDate"
  kind: DocKind;
  name: string;
  filePath: string;        // Relative to project root
  line: number;
  signature: string;       // Full type signature as string
  description?: string;    // From JSDoc/TSDoc @description or leading comment
  params?: DocParam[];
  returns?: DocReturn;
  throws?: string[];       // From @throws
  examples?: string[];     // From @example
  deprecated?: string;     // From @deprecated
  since?: string;          // From @since
  tags: Record<string, string>; // Any additional JSDoc tags
  isExported: boolean;
  isInternal: boolean;     // @internal tag
  children?: DocNode[];    // For classes: methods + properties
}

export interface DocFile {
  filePath: string;
  moduleName?: string;     // From @module tag
  description?: string;    // Module-level comment
  nodes: DocNode[];
}

export interface DocProject {
  name: string;
  version: string;
  files: DocFile[];
  generatedAt: string;     // ISO timestamp
}
```

The `id` field is the cornerstone of orphan tracking. It must be stable across renames where possible (e.g., use fully-qualified path + symbol name).

---

## 7. Config Schema

```typescript
// ovellum.config.ts (at project root)

import { defineConfig } from 'ovellum';

export default defineConfig({
  // Project identity
  name: 'My Project',          // Defaults to package.json name
  version: 'auto',             // 'auto' reads from package.json

  // Mode
  mode: 'hybrid',              // 'hybrid' | 'manual' | 'auto'

  // Source (used in 'auto' and 'hybrid' modes)
  input: './src',              // Source directory to parse
  include: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
  exclude: [
    'node_modules',
    'dist',
    '**/*.test.*',
    '**/*.spec.*',
    '**/*.d.ts',
  ],
  includeInternal: false,      // Whether to document @internal symbols
  includePrivate: false,       // Whether to document private class members

  // Output
  output: './docs',            // Where docs are written

  // Format
  defaultFormat: 'md',        // 'md' | 'mdx'

  // Protect (used in 'hybrid' mode)
  protect: {
    blockTag: '@manual',       // Tag used in Markdown: <!-- @manual:start -->
    inlineTag: '@preserve',    // Tag used in source JSDoc: @preserve
    orphanStrategy: 'quarantine', // 'quarantine' | 'warn' (future: 'delete')
    orphanDir: '.ovellum/orphans',
    orphanRetention: 90,       // Days before archived orphans are flagged for cleanup
  },

  // Hooks (future: plugin system foundation)
  // hooks: { ... }
});
```

Config supports per-directory overrides via a `ovellum.config.ts` in any subdirectory, which merges with the root config (child wins on conflicts).

Frontmatter in individual `.md` / `.mdx` files can also override mode:

```markdown
---
ovellum:
  mode: manual
---
```

---

## 8. Tagging System (Specification)

### 8.1 In Markdown Files (Block Protection)

```markdown
<!-- @manual:start id="intro-paragraph" -->
This paragraph was written by a human. The auto-documentor
will not overwrite or remove this content on regeneration.
<!-- @manual:end -->
```

Rules:
- The `id` attribute is optional but strongly recommended. Without it, O’Vellum generates a positional ID that is fragile (e.g., `manual-block-3`).
- With an explicit `id`, the block survives file restructuring as long as the anchor symbol still exists.
- Blocks can appear anywhere in a `.md` or `.mdx` file.
- Nested blocks are not supported and will produce a warning.
- Content between tags is treated as opaque - O’Vellum does not parse or validate it.

### 8.2 In TypeScript/JavaScript Source (Inline Protection)

```typescript
/**
 * Formats a date string into a human-readable format.
 * This description is auto-generated.
 *
 * @preserve
 * **Note:** This function uses the user's local timezone by default.
 * Override with the `timezone` option if deterministic output is needed.
 * This note was added manually and should not be regenerated.
 *
 * @param date - The date to format
 * @param format - Output format string
 */
export function formatDate(date: Date, format: string): string { ... }
```

Rules:
- `@preserve` applies to the entire JSDoc block, not just what follows it.
- When `@preserve` is present, the full JSDoc comment block is treated as manually managed.
- O’Vellum will still read the comment to build the IR (for type signatures, params, etc.), but will not overwrite the doc comment in the source or in the generated output.
- The generated Markdown will include a fenced zone wrapping the content from `@preserve` to the end of the JSDoc, protected from future regeneration.

### 8.3 Anchor IDs and Stability

Every protected block is associated with an anchor - the documentation symbol it lives within. The anchor ID format is:

```
{relative-file-path}::{symbol-path}
```

Examples:
- `src/utils/format.ts::formatDate`
- `src/models/User.ts::User.constructor`
- `src/index.ts::__module__`  (for module-level comments)

When an anchor disappears (function deleted, renamed without redirect), O’Vellum quarantines the protected block. See Section 9.

---

## 9. Merge Engine

The merge engine is the core of `hybrid` mode. It runs on every `ovellum build`.

### 9.1 Algorithm

```
For each output .md file:

  1. READ existing file → parse into AST
  2. EXTRACT all protected zones → Map<anchorId, ProtectedBlock>
  3. GENERATE fresh content for this file from IR
  4. For each section in generated content:
       a. Look up anchor ID in protected zone map
       b. If found → splice protected block into generated content at the correct location
       c. Remove from map (it has been placed)
  5. If any protected zones remain in map (anchor no longer exists in IR):
       → QUARANTINE each remaining block (see 9.2)
  6. WRITE merged content to output file
```

### 9.2 Orphan Quarantine

When a protected block's anchor disappears:

1. The block is written to `.ovellum/orphans/{YYYY-MM-DD}_{anchorId}.md` with full metadata header:

```markdown
---
orphaned: 2026-05-12T10:30:00Z
source_file: docs/utils/format.md
anchor_id: src/utils/format.ts::formatDate
anchor_last_seen: 2026-05-10T08:00:00Z
manual_block_id: intro-paragraph
---

[original protected content here]
```

2. O’Vellum prints a warning on stdout:

```
⚠  3 orphaned manual section(s) detected.
   Run `ovellum orphans` to review.
   Archived to: .ovellum/orphans/
```

3. `ovellum orphans` is a CLI subcommand that lists orphaned blocks with their metadata, shows a diff of what was lost, and offers interactive options:
   - Reattach to a new anchor
   - Delete permanently
   - Leave in archive

4. Orphans older than `orphanRetention` days are flagged in `ovellum orphans --stale` output.

5. `.ovellum/orphans/` should be committed to version control. Orphan files are human-readable Markdown - reviewable in PRs.

### 9.3 Conflict Detection

O’Vellum does not attempt three-way merges. The contract is:
- Auto-generated content → owned by O’Vellum, replaced freely
- Protected zones → owned by the human, never touched

There is no middle ground that creates merge conflicts. This is a deliberate simplicity decision.

---

## 10. Parser Design (`@ovellum/parser`)

Built on `ts-morph`, which exposes the full TypeScript compiler API with a friendlier surface.

### 10.1 What is extracted

| Symbol | Extracted info |
|---|---|
| `function` | Name, params (name, type, optional, default), return type, JSDoc, generics, overloads |
| `class` | Name, constructor, methods, properties, implements, extends, JSDoc |
| `interface` | Name, members (properties, methods, index signatures), extends, JSDoc |
| `type` | Name, definition, JSDoc |
| `enum` | Name, members (name + value), JSDoc |
| `const` / `let` / `var` | Name, type, JSDoc (exported only, unless includeInternal) |
| Module-level | File-level JSDoc comment block (`/** @module ... */`) |

### 10.2 What is NOT extracted (v1)

- Non-exported symbols (unless `includeInternal: true`)
- Symbols marked `@internal` (unless `includeInternal: true`)
- Private class members (unless `includePrivate: true`)
- Decorator metadata
- Namespace merging (warn if encountered)
- `declare module` augmentations (warn if encountered)

### 10.3 Stability of anchor IDs

The anchor ID uses the symbol's fully qualified name within the file. Renaming a symbol changes its ID. This is acceptable in v1 - document it clearly. Future: a `@ovellum-id` JSDoc tag could allow stable custom IDs.

```typescript
/**
 * @ovellum-id utils/date/formatDate
 */
export function formatDate() { ... }
```

### 10.4 JSDoc tag support

Supported tags (first pass):
`@param`, `@returns` / `@return`, `@throws` / `@exception`, `@example`, `@deprecated`, `@since`, `@see`, `@remarks`, `@description`, `@preserve`, `@internal`, `@module`

Unknown tags are collected into the `tags` bag on `DocNode` and passed through to output.

---

## 11. Generator Design (`@ovellum/generator`)

Transforms a `DocProject` IR into a tree of Markdown strings, one per output file.

### 11.1 Output structure (default)

Given `input: './src'` and `output: './docs'`, the directory structure mirrors the source:

```
src/utils/format.ts     →  docs/utils/format.md
src/models/User.ts      →  docs/models/User.md
src/index.ts            →  docs/index.md
```

A `docs/_sidebar.md` (or `_index.md`) is generated as a table of contents. Structure is configurable.

### 11.2 Per-symbol Markdown template

```markdown
## `formatDate`

```typescript
function formatDate(date: Date, format: string): string
```

Formats a date string into a human-readable format.

**Parameters**

| Name | Type | Description |
|---|---|---|
| `date` | `Date` | The date to format |
| `format` | `string` | Output format string |

**Returns** `string`

**Example**

```typescript
formatDate(new Date(), 'YYYY-MM-DD') // '2026-05-12'
```
```

### 11.3 MDX output

When `defaultFormat: 'mdx'`, the generator emits `.mdx` files with the same content but allows JSX imports in `@example` blocks if they contain JSX syntax. The generator detects this heuristically (presence of `<` tags in example code) and warns the user to verify.

### 11.4 Frontmatter

Every generated file gets frontmatter:

```yaml
---
title: format
source: src/utils/format.ts
generated: 2026-05-12T10:30:00Z
ovellum: true
---
```

The `ovellum: true` flag allows the reader to identify auto-generated files vs. purely manual ones.

---

## 12. Reader Design (`@ovellum/reader`)

Reads existing `.md` and `.mdx` files from the output directory. Used by the merge engine in `hybrid` mode, and as the sole input in `manual` mode.

Responsibilities:
- Parse frontmatter (using `gray-matter`)
- Parse Markdown AST (using `remark`)
- Locate and extract all `<!-- @manual:start -->` / `<!-- @manual:end -->` blocks
- Map each block to its anchor ID
- Return a `ManualDoc` structure for the merge engine

In `manual` mode, the reader also validates:
- Broken internal links
- Missing frontmatter fields (configurable)
- Malformed protected zone tags (unclosed, nested)

---

## 13. CLI Design (`ovellum`)

Installed globally or run via `npx ovellum`.

```
ovellum build          Build docs (uses mode from config)
ovellum watch          Build + watch for file changes
ovellum check          Validate config, find orphans, check links
ovellum orphans        List, inspect, and manage orphaned manual sections
ovellum init           Interactive setup: creates ovellum.config.ts, docs/
ovellum clean          Remove generated output files (preserves manual files)
```

### `ovellum init` flow

1. Detect package name and version from `package.json`
2. Ask: mode preference (hybrid / manual / auto)
3. Ask: input directory (default `./src`)
4. Ask: output directory (default `./docs`)
5. Ask: preferred format (md / mdx)
6. Write `ovellum.config.ts`
7. Create `docs/` with a `README.md` stub (manual) or run first build (auto/hybrid)
8. Add `.ovellum/` to `.gitignore` EXCEPT `.ovellum/orphans/` (that should be committed)
9. Suggest adding `ovellum build` to CI

### Exit codes

| Code | Meaning |
|---|---|
| `0` | Success |
| `1` | Build errors (parse failure, write failure) |
| `2` | Warnings promoted to errors (orphans found, when `--strict`) |
| `3` | Config invalid |

### `--strict` flag

When passed, any warnings (orphaned sections, broken links, missing descriptions on exported symbols) become errors and exit with code `2`. Useful for CI.

---

## 14. File Watching (`ovellum watch`)

Uses `chokidar` to watch:
- Source files matching `include` patterns (triggers re-parse + re-generate + re-merge)
- Manual doc files in `output/` (triggers re-merge only, no re-parse)
- `ovellum.config.*` (triggers full restart)

Debounce: 300ms. On change, only affected files are rebuilt (incremental). Cache of parsed IR is maintained in memory.

---

## 15. Testing Strategy

### Unit tests (`vitest`)

Every package has its own test suite co-located under `packages/{name}/src/__tests__/`.

| Package | What to test |
|---|---|
| `parser` | IR correctness for each symbol type; edge cases (overloads, generics, re-exports, barrel files) |
| `generator` | Markdown output for each IR node type; frontmatter; MDX flag |
| `merger` | Protected zone extraction; merge output; orphan detection; ID stability |
| `reader` | Frontmatter parsing; protected zone detection; broken link detection |
| `cli` | Argument parsing; exit codes; init flow |

### Integration / fixture tests

Under `tests/integration/`. Each fixture is a minimal TypeScript project:

```
tests/fixtures/
  simple-function/
    src/index.ts              # Input source
    docs/index.md             # Existing doc with manual zones
    expected/index.md         # Expected output after merge
    ovellum.config.ts        # Fixture-specific config
```

The integration test runner runs `ovellum build` against each fixture and diffs the output against `expected/`. Any diff = test failure.

Fixtures cover:
- Pure auto mode output
- Pure manual mode pass-through
- Hybrid: protected zones survive regeneration
- Hybrid: orphan is quarantined when anchor is removed
- Hybrid: protected zone without `id` (positional fallback)
- Config: per-directory mode override
- Config: frontmatter mode override
- Edge: empty source file
- Edge: source file with only types (no runtime exports)
- Edge: circular re-exports
- Edge: namespace exports

### Coverage target

- Unit: 90%+ line coverage (enforced in CI via `vitest --coverage`)
- Integration: all fixtures pass
- No snapshot tests - prefer explicit `expected/` files reviewable in PRs

---

## 16. Open Source Setup

### Repository

- GitHub, public from day one
- MIT license
- `main` is the stable branch; `dev` is working branch
- PRs required for all changes (even from maintainer)

### Files at root

- `README.md` - project overview, quickstart, badges
- `CONTRIBUTING.md` - setup instructions, PR process, code style
- `CHANGELOG.md` - managed by changesets
- `LICENSE` - MIT
- `docs/internal/DESIGN.md` - this file (design & architecture spec)
- `docs/internal/TODO.md` - living implementation checklist
- `.github/`
  - `ISSUE_TEMPLATE/bug_report.md`
  - `ISSUE_TEMPLATE/feature_request.md`
  - `PULL_REQUEST_TEMPLATE.md`
  - `workflows/ci.yml`
  - `workflows/release.yml`

### CI pipeline (GitHub Actions)

On every PR:
1. `pnpm install`
2. `pnpm lint` - ESLint + Prettier check
3. `pnpm typecheck` - `tsc --noEmit` across all packages
4. `pnpm test` - Vitest unit + integration
5. `pnpm build` - tsup build across all packages
6. Coverage report posted as PR comment

On merge to `main`:
1. All of the above
2. `changesets version` if a changeset is present
3. `pnpm publish` to npm (after version bump)
4. GitHub Release created

### npm package

- Package name: `ovellum` (check availability before finalizing name)
- Single public package: the CLI (`packages/cli`)
- Internal packages are not published
- Supports Node.js 18+ (LTS)
- Ships both CJS and ESM via tsup dual output
- `bin.ovellum` entry in `package.json`

---

## 17. Self-Documentation

O’Vellum documents itself. The `docs/` directory in the repo is built using O’Vellum in `hybrid` mode. This serves three purposes:

1. Dogfooding - any bugs in the tool surface against the tool's own docs
2. Demonstration - the repo itself is the best example project
3. Completeness - the docs are always in sync with the codebase

This means `ovellum.config.ts` at the root points to `packages/` as input and `docs/` as output, with appropriate excludes for test files.

---

## 18. Design Decisions Log

Decisions that were consciously made and should not be revisited without documented reason.

| Decision | Rationale |
|---|---|
| No three-way merge | Complexity isn't worth it. The contract (auto-owned vs. human-owned) is simpler and more predictable. |
| No plugin system in v1 | Design for extensibility; don't build the extension points until there are real use cases. |
| Orphans committed to version control | Manual writing is valuable. Loss must be visible in PRs, not silently swallowed. |
| `.md` output, not HTML | The tool is a documentation *generator*, not a renderer. Hosting/rendering is a separate concern. |
| pnpm over npm/yarn | Strict dependency resolution, good monorepo support, faster. |
| `ts-morph` over raw TS compiler API | 80% less boilerplate. Full fidelity. Worth the dependency. |
| `c12` for config | Native `.ts` config support without compilation step. Handles env overrides cleanly. |
| Single public npm package | Simpler for users. Internal architecture is an implementation detail. |
| Node 18+ minimum | Fetch API, `--experimental-vm-modules` for vitest, modern ESM. No reason to support older. |

---

## 19. Known Limitations (v1)

Document these clearly in the README so users set correct expectations.

- TypeScript and JavaScript only. Python, Go, Rust, etc. are not supported.
- No GUI. CLI only.
- No built-in renderer. Output is Markdown; rendering/hosting is the user's responsibility.
- Re-exports and barrel files (`export * from './foo'`) are parsed but may produce duplicate entries. Document the workaround (`@internal` on the barrel re-export).
- Circular imports are handled by ts-morph but may produce incomplete IR for edge cases. Warn and continue.
- No real-time collaboration features.
- No built-in search index generation (future scope).

---

## 20. Future Scope (Explicitly Post-v1)

- Renderer / static site output (the hosting platform referenced in early planning)
- Plugin API for custom IR transforms and output formats
- Language support: Python (via AST parsing), Go (via go/doc), Rust (via rustdoc JSON)
- Search index generation (Pagefind, Algolia compatible)
- GitHub integration: auto-PR for doc updates when source changes
- VS Code extension: preview protected zones, navigate to source
- `@ovellum-id` tag for stable custom anchor IDs
- Per-symbol `mode` override via JSDoc tag
