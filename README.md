# Ovellum

> Write what matters, generate the rest - open source documentation where both live together.

Ovellum is an open source documentation tool for TypeScript and JavaScript projects. It bridges the gap between auto-generated API documentation and hand-crafted narrative writing - letting both live in the same place, in the same files, without conflict.

Technical identifier: `ovellum` - for npm, CLI, folders, and domains.

- Site https://ovellum.oss.oinam.com
- Source https://github.com/oinam/ovellum

---

## Problem

Documentation tools today force a choice. Either you auto-generate from code and lose the human voice, or you hand-write everything and watch it drift from reality as the code moves. Teams end up maintaining two parallel worlds - a generated API reference nobody reads, and a hand-written guide that's quietly out of date.

The deeper problem is the merge. When a tool regenerates docs, it overwrites manual edits. When writers add context, the next build erases it. So teams stop trying to keep them in sync, and documentation rots.

## What Ovellum Does

Ovellum maintains a tagging contract between the tool and the human. Writers mark sections of a document as manually owned. The tool respects those boundaries on every subsequent build - updating the auto-generated parts around them, leaving the human-written parts untouched.

### Three modes, one tool:

1. Hybrid (default). Auto-generation and manual writing coexist in the same files. Protected zones are tagged and preserved across every rebuild.
2. Manual. Ovellum acts as a Markdown-first static documentation builder. No source parsing. Writers own everything.
3. Auto. Full auto-generation from source. No manual layer.

Markdown is the first-class format throughout. `.mdx` is also supported. No proprietary formats, no lock-in.

## What Happens When Code Changes

When a function or class that had manually-written documentation attached to it is renamed or deleted, Ovellum quarantines the orphaned section into a versioned archive (`.ovellum/orphans/`) and warns the author. Manual writing is never lost without a human knowing.

## How It Is Being Built

Ovellum is built in TypeScript, and designed to be installed and run via `npx ovellum` with zero global dependencies required.

### Components;

- Core. Shared types, the configuration schema, and the intermediate representation the other packages build on.
- Parser. Reads TypeScript and JavaScript source files and extracts documented symbols (functions, classes, interfaces, types, enums) into a structured intermediate representation.
- Generator. Converts that representation into clean Markdown.
- Merger. Combines auto-generated content with existing manual files, respects tagged protected zones, and handles orphaned content gracefully.
- Reader. Parses existing Markdown and MDX files, extracts protected zones, and validates document structure.
- Site. The manual-mode static-site builder: renders Markdown into a themed, searchable HTML site.
- CLI. User-facing surface: `init`, `build`, `dev`, `watch`, `serve`, `check`.

The detailed technical architecture, package structure, config schema, tagging specification, and merge algorithm are documented in [`docs/internal/DESIGN.md`](docs/internal/DESIGN.md). The full implementation checklist is in [`docs/internal/TODO.md`](docs/internal/TODO.md). Both are intended as the hand-off documents for implementation.

## Scope (Version 1)

- TypeScript and JavaScript only - no other languages in v1.
- Output is Markdown - the rendering and hosting layer is a separate, later concern.
- No GUI - CLI only.
- No plugin system - designed for extensibility, but extension points are not built yet.

## Development

Scaffold a site, watch it, check it, build it:

```bash
npx ovellum init       # scaffold a new project
npx ovellum watch      # rebuild on every change to content/
npx ovellum check      # broken-link + unsafe-URL lint
npx ovellum build      # one-shot production build
```

Full walkthrough — prerequisites, the iteration loop, the recommended
two-terminal setup, working with multiple sites in one repo — lives in
the [Development guide](https://ovellum.oss.oinam.com/docs/guides/development/).

Working on Ovellum itself (the monorepo, packages, tests, this
website)? See [Contributing](https://ovellum.oss.oinam.com/docs/contributing/).

→ [Read the Documentation for details.](https://ovellum.oss.oinam.com/docs/)
