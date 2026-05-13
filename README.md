# O’Vellum

> Write what matters, generate the rest - open source documentation where both live together.

**O’Vellum** is an open source documentation tool for TypeScript and JavaScript projects. It bridges the gap between auto-generated API documentation and hand-crafted narrative writing - letting both live in the same place, in the same files, without conflict.

Technical identifier: `ovellum` - for npm, CLI, folders, and domains.

---

## The Problem

Documentation tools today force a choice. Either you auto-generate from code and lose the human voice, or you hand-write everything and watch it drift from reality as the codebase moves. Teams end up maintaining two parallel worlds - a generated API reference nobody reads, and a hand-written guide that's quietly out of date.

The deeper problem is the merge. When a tool regenerates docs, it overwrites manual edits. When writers add context, the next build erases it. So teams stop trying to keep them in sync, and documentation rots.

---

## What O'Vellum Does

O'Vellum introduces a tagging contract between the tool and the author. Writers mark sections of a document as manually owned. The tool respects those boundaries on every subsequent build - updating the auto-generated parts around them, leaving the human-written parts untouched.

Three modes, one tool:

- **Hybrid** (default) - Auto-generation and manual writing coexist in the same files. Protected zones are tagged and preserved across every rebuild.
- **Manual** - O'Vellum acts as a Markdown-first static documentation builder. No source parsing. Writers own everything.
- **Auto** - Full auto-generation from TypeScript/JavaScript source. No manual layer. Fast, complete, zero friction.

Markdown is the first-class format throughout. `.mdx` is also supported. No proprietary formats, no lock-in.

---

## What Happens When Code Changes

When a function or class that had manually-written documentation attached to it is renamed or deleted, O'Vellum does not silently drop that writing. It quarantines the orphaned section into a versioned archive (`.docsmith/orphans/`), warns the author, and surfaces it via `ovellum orphans` for review. Manual writing is never lost without the author knowing.

---

## How It Is Being Built

O'Vellum is built in TypeScript, structured as a monorepo, and designed to be installed and run via `npx ovellum` with zero global dependencies required.

The core components are:

- **Parser** - reads TypeScript and JavaScript source files and extracts documented symbols (functions, classes, interfaces, types, enums) into a structured intermediate representation.
- **Generator** - converts that representation into clean Markdown.
- **Merger** - the core innovation. Combines auto-generated content with existing manual files, respects tagged protected zones, and handles orphaned content gracefully.
- **Reader** - parses existing Markdown and MDX files, extracts protected zones, and validates document structure.
- **CLI** - the user-facing surface: `build`, `watch`, `check`, `orphans`, `init`, `clean`.

The detailed technical architecture, package structure, config schema, tagging specification, and merge algorithm are documented in [`docs/internal/DESIGN.md`](docs/internal/DESIGN.md). The full implementation checklist is in [`docs/internal/TODO.md`](docs/internal/TODO.md). Both are intended as the handoff documents for implementation.

---

## Scope (Version 1)

- TypeScript and JavaScript only - no other languages in v1.
- Output is Markdown - the rendering and hosting layer is a separate, later concern.
- No GUI - CLI only.
- No plugin system - designed for extensibility, but extension points are not built yet.

---

## Inspiration

The idea sits between two tools that do one half of the job well:

- [Mintlify](https://mintlify.com) - beautiful auto-generated API docs, strong developer experience.
- [Retype](https://retype.com) - clean, Markdown-native static documentation for human writers.

O'Vellum does both, and adds the merge layer that makes them work together.

---

## Open Source

O'Vellum is open source from day one, MIT licensed. Code quality, test coverage, and contributor experience are treated as first-class requirements, not afterthoughts.