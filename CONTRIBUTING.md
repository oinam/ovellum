# CONTRIBUTING

Thanks for your interest in Ovellum. This document explains how to set up a development environment, how to propose changes, and how releases work.

## Prerequisites

- Node.js 20 or 22 (LTS). See `.nvmrc`.
- pnpm 10 or newer. Install with `corepack enable && corepack prepare pnpm@latest --activate`, or follow the instructions at <https://pnpm.io/installation>.
- Git.

## Repository layout

```
ovellum/
├── packages/
│   ├── core/        @ovellum/core      Shared types & IR
│   ├── parser/      @ovellum/parser    TS/JS source → IR
│   ├── generator/   @ovellum/generator IR → Markdown
│   ├── reader/      @ovellum/reader    Markdown → protected zones
│   ├── merger/      @ovellum/merger    Merge engine
│   └── cli/         ovellum            Public CLI (the only published package)
├── tests/           Unit, integration, fixtures
└── docs/internal/   DESIGN.md, TODO.md (planning documents)
```

The full design is in `docs/internal/DESIGN.md`. The current implementation checklist is in `docs/internal/TODO.md`.

## Development workflow

```bash
git clone https://github.com/<owner>/ovellum.git
cd ovellum
pnpm install
pnpm build      # build every package
pnpm typecheck  # tsc across the workspace
pnpm lint       # eslint
pnpm test       # vitest
```

Turborepo caches task outputs, so subsequent runs are fast. Use `pnpm <task> --filter <package>` to target a single package, e.g. `pnpm test --filter @ovellum/parser`.

## Using AI to contribute

Ovellum is AI-native, and contributing with an AI assistant is a first-class, encouraged path. The repo ships everything an agent needs to work here well:

- **`AGENTS.md`** (repo root) — the conventions an agent must follow in this codebase. Most AI coding tools read it automatically.
- **`CLAUDE.md`** — project instructions for Claude Code specifically (layout, commands, working agreements).
- **The Ovellum MCP server** — the project documents itself with its own tooling. Install it so your assistant can query symbols, diff the docs against the source, search the docs, and write into protected zones safely:
  - Claude Code: `/plugin marketplace add oinam/ovellum` then `/plugin install ovellum@ovellum`.
  - Other MCP clients (Cursor, Windsurf, Cline, VS Code): add `{ "command": "npx", "args": ["-y", "ovellum", "mcp"] }`.
  - See the [Automation & AI agents guide](https://ovellum.oss.oinam.com/docs/guides/automation/).

Whatever tool you use, a contribution must clear the same bar as a hand-written one — these are the things agents most often miss:

- **Docs are bilingual.** Every user-facing change updates the English docs under `website/content/en-US/**` **and** the 1:1 Japanese mirror under `website/content/ja/**`, then runs `ovellum check --cwd website --update-translations` to re-stamp. A PR that touches docs in only one language will not be merged.
- **CLI-visible changes need a changeset** (`pnpm changeset`) — see below.
- **Respect the hybrid contract.** In generated/merged docs, hand-written prose only survives inside `@manual` protected zones; never hand-edit a generated region. (`AGENTS.md` spells this out.)
- **Green before you push:** `pnpm build && pnpm typecheck && pnpm lint && pnpm test`.

You are responsible for everything you submit, AI-assisted or not: read the diff, make sure the tests genuinely pass, and keep the PR to one focused change. Don't paste machine output you haven't verified.

## Branches and pull requests

- `main` is the stable branch. CI must be green before any merge.
- All changes — including those from maintainers — land via pull request.
- Branch naming is informal but should be descriptive: `feat/parser-overloads`, `fix/orphan-windows-paths`.
- Pull requests must include the PR template's test plan filled out.
- One logical change per PR. If a PR grows beyond a reviewable size, split it.

## Code style

- TypeScript with `strict: true` everywhere; no `any` unless justified in a comment.
- ESLint and Prettier are enforced in CI. Run `pnpm format` locally before pushing.
- Tests live alongside source in `src/__tests__/` for unit tests; integration fixtures live under `tests/fixtures/`.
- Default to writing no comments. Add one only when the _why_ is non-obvious.

## Changesets

Any change that affects the published `ovellum` package needs a changeset. Run:

```bash
pnpm changeset
```

Answer the prompts (which package, semver bump, summary) and commit the generated `.changeset/*.md` file alongside your PR. Internal `@ovellum/*` packages are configured as ignored in changesets, so most parser/generator/merger/reader/core PRs do not need one. CLI-visible behavior changes do.

## Release process

On merge to `main`, the `Release` workflow runs:

1. If pending changesets exist, it opens (or updates) a "Version Packages" PR that bumps the `ovellum` version and updates the changelog.
2. When that version PR is merged, the workflow publishes `ovellum` to npm and creates a GitHub Release.

Maintainers do not publish manually.

## Reporting bugs and proposing features

Use the GitHub issue templates. For security-sensitive reports, email the maintainer rather than filing a public issue.
