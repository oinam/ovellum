# Contributing to O'Vellum

Thanks for your interest in O'Vellum. This document explains how to set up a development environment, how to propose changes, and how releases work.

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
- Default to writing no comments. Add one only when the *why* is non-obvious.

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
