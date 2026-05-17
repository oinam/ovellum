---
title: Contributing
description: Set up the repo, run the tests, and send a pull request.
---

# Contributing

Ovellum is an open-source project; pull requests and issues are
welcome. This page covers the basics of getting set up and the
conventions we follow.

## Local setup

Clone, install, build, run the test suite:

```bash
git clone https://github.com/oinam/ovellum.git
cd ovellum
pnpm install
pnpm exec turbo run build --filter='@ovellum/*' --filter='ovellum'
pnpm exec turbo run test --filter='@ovellum/*' --filter='ovellum'
```

> If you're a user (not a contributor) and just want the iteration
> loop for your own site, the [Development guide](/guides/development/)
> covers `ovellum init` / `watch` / `check` / `build`. This page is the
> contributor-side: working inside the Ovellum monorepo itself.

## Run this website locally

The site you're reading is a fully-fledged Ovellum site that lives at
`website/` in the repo. Four workspace scripts cover everything:

| Script                          | What it does                                                          |
| ------------------------------- | --------------------------------------------------------------------- |
| `pnpm -w run dev:website`       | Build packages, then run `ovellum dev` against `website/`. The one-command loop: build + watch + serve + live reload. Open the URL it prints. |
| `pnpm -w run build:website`     | One-shot production build into `website/dist/`. CI runs this.         |
| `pnpm -w run serve:website`     | Serve `website/dist/` without watching (assumes a prior build).       |
| `pnpm -w run check:website`     | Broken-link + unsafe-URL lint.                                        |

The day-to-day loop:

```bash
pnpm -w run dev:website
# edit anything under website/content/, browser auto-refreshes
```

### Why these scripts wrap the CLI

Inside this repo we're working on Ovellum itself. The scripts run the
**locally-built** CLI (`node packages/cli/dist/index.js`) so your edits
to packages take effect immediately. Using `npx ovellum` would fetch
the published version and miss your changes.

If you're iterating on `@ovellum/site`, `@ovellum/core`, or the CLI
itself, the scripts re-run the package build before invoking the
command — so a change in `packages/site/src/...` shows up in the next
website rebuild without extra steps.

### Demo fixtures

The two `examples/` projects double as end-to-end smoke tests:

```bash
pnpm -w run demo        # auto/hybrid demo against examples/simple-ts/
pnpm -w run demo:site   # manual demo against examples/manual-site/
```

Output lands inside each example directory; both are gitignored.

## Repo layout

```
packages/
  core/        Shared types, config loader, error class.
  parser/      TypeScript / JavaScript source → DocProject IR.
  generator/   DocProject IR → Markdown output.
  reader/      Markdown → frontmatter + protected zones.
  merger/      Splice protected zones; quarantine orphans.
  site/        Static-site builder for manual mode.
  cli/         The `ovellum` CLI.

examples/      Demo fixtures.
website/       This site.
docs/internal/ Planning docs (DESIGN, SITE, STYLES, TODO, FEATURES, …).
```

## Issue triage

Open issues at <https://github.com/oinam/ovellum/issues>. Before filing:

- Search closed issues — your problem may already have a known
  workaround.
- Include the Ovellum version (`npx ovellum --version` will work once
  there's a `--version` flag), Node version, and a minimal reproduction.
- For bugs: state expected vs actual behaviour.
- For features: describe the use case before the proposed shape; we'd
  rather understand what you're trying to do than debate API surface in
  isolation.

## Commit conventions

We follow Conventional Commits loosely:

- `feat(scope): …` for new functionality
- `fix(scope): …` for bug fixes
- `docs(scope): …` for documentation
- `chore(scope): …` for tooling / cleanup
- `build(scope): …` for build pipeline changes
- `refactor(scope): …` for behaviour-preserving internal changes

The "scope" is usually a package name (`core`, `parser`, `site`, …)
or a high-level area (`cli`, `docs`, `examples`).

Commits should pair with documentation updates in the same commit — see
the internal cadence rule. If you change a config field, update
`reference/config.md`. If you change a CLI flag, update
`reference/cli.md`.

## Pull requests

- Branch from `main`. Name the branch `<scope>/<short-description>`,
  e.g., `parser/handle-overloads`.
- Push early; mark the PR as draft if it's still in flux.
- CI runs lint, typecheck, tests, and a build on every push to the PR
  branch.
- Once the PR is green and you'd like a review, mark it ready.
- We aim to respond within a week. Pinging is fine after that.

## Code style

- TypeScript, strict mode. No `any` unless interfacing with an untyped
  external API.
- Use `import type` for type-only imports. The build pipeline relies on
  it (`verbatimModuleSyntax: true`).
- Prettier formats everything; `pnpm format` does the run.
- ESLint flat config + typescript-eslint enforces the rules; `pnpm lint`
  on a single package or `pnpm exec turbo run lint` workspace-wide.
- One default rule: no emojis in code, output, or docs. We use text
  labels or monochrome inline SVG instead.

## Releasing

(For maintainers.) Releases use `changesets`:

```bash
pnpm changeset
# follow the prompts, then commit the generated .changeset/*.md
```

On merge to `main`, the release workflow opens a "Version Packages" PR
that bumps version numbers and updates `CHANGELOG.md`. Merging that PR
publishes to npm.

## Roadmap, decisions, and design

The high-level shape of the project lives in:

- [`docs/internal/DESIGN.md`](https://github.com/oinam/ovellum/blob/main/docs/internal/DESIGN.md)
  — original architecture for the merge engine, IR, tagging contract.
- [`docs/internal/SITE.md`](https://github.com/oinam/ovellum/blob/main/docs/internal/SITE.md)
  — design for the manual-mode static-site builder.
- [`docs/internal/STYLES.md`](https://github.com/oinam/ovellum/blob/main/docs/internal/STYLES.md)
  — design tokens (palette, type / space scales).
- [`docs/internal/TODO.md`](https://github.com/oinam/ovellum/blob/main/docs/internal/TODO.md)
  — code-side checklist; what's done and what's deferred.
- [`docs/internal/TODO-Human.md`](https://github.com/oinam/ovellum/blob/main/docs/internal/TODO-Human.md)
  — human-only items: prose authorship, product decisions, releases.

Pull requests that close a TODO item are welcome — link the relevant
section in the PR description.
