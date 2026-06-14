---
title: Install
description: Add Ovellum to your project with pnpm, npm, yarn, or bun.
---

# Install

Ovellum ships as a single npm package (`ovellum`). It's a build-time CLI; the
package adds nothing to your runtime bundle.

## Requirements

- **Node.js 20 or newer.** Node 18 reached end-of-life in April 2025; we
  don't support it.
- **A TypeScript or JavaScript project.** Ovellum can run in either; you
  don't need `tsconfig.json` for manual mode.

## Adding it to your project

### pnpm

```bash
pnpm add -D ovellum
```

### npm

```bash
npm install --save-dev ovellum
```

### yarn

```bash
yarn add --dev ovellum
```

### bun

```bash
bun add -d ovellum
```

## Without installing

If you'd rather not commit Ovellum as a dependency, you can run it via
`npx`:

```bash
npx ovellum build
```

The first invocation downloads and caches the package. Subsequent runs reuse
the cache. This is convenient for one-off generation but slows down CI
because the package manager has to re-resolve each run; for repeated builds,
prefer the `--save-dev` install.

## Global install

Prefer a project-local dependency (above) — it pins the version per project and
keeps CI builds reproducible. But if you want the `ovellum` command available
everywhere (handy for scaffolding or one-off builds), install it globally:

```bash
npm install -g ovellum
# or:
pnpm add -g ovellum
yarn global add ovellum
bun add -g ovellum
```

Then run it directly — no `npx` needed:

```bash
ovellum --version
ovellum build
```

A global install puts a single version on your `PATH` for every project; when
two projects need different versions, use the project-local install instead so
each pins its own. (Node 20+ either way.)

## Verifying the install

After installing, run:

```bash
npx ovellum build --help   # project-local; for a global install, drop `npx`
```

You should see the synopsis for the `build` subcommand. If you see "command
not found", check that you're inside the project where you installed, and
that your package manager's binaries are on `PATH` (pnpm sometimes needs an
extra `pnpm setup`).

## Upgrading

The built-in command checks npm for the latest release and reinstalls it with
your package manager:

```bash
ovellum upgrade            # from inside a project → upgrades the project's local copy
```

`upgrade` **targets the project's local dependency whenever it finds one** — if
the current directory's `package.json` declares `ovellum` (or it's already in
`node_modules`), it runs `… add -D ovellum@latest` against the project, even when
you invoke the global binary. Only outside such a project does it fall back to a
global install. It tells you which one it's about to touch:

```text
Update available: 0.10.0 → 0.10.1 (this project's local dependency).
Run `pnpm add -D ovellum@latest`?
```

The package manager is taken from the project's lockfile (`pnpm-lock.yaml`,
`yarn.lock`, …), so a `pnpm` project upgrades with `pnpm` even from a bare global
binary. Preview with `--dry-run`, or skip the confirmation with `--yes`. (See the
[`upgrade` reference](/docs/reference/cli/#ovellum-upgrade).) Ovellum also prints a
one-line *"update available"* notice after commands when a newer version exists
(cached; disable it with `update: { check: false }` in your config).

### Upgrading by hand

If you'd rather run the package manager yourself, install **`@latest`**
explicitly:

```bash
pnpm add -D ovellum@latest
# or: npm install -D ovellum@latest  ·  yarn add -D ovellum@latest  ·  bun add -d ovellum@latest
```

> **Why `@latest` and not `npm update`?** Ovellum is still pre-1.0, and a caret
> range — `"ovellum": "^0.9.0"`, what the installers write by default — means
> `>=0.9.0 <0.10.0` for `0.x` versions: it **pins the minor**. So `npm update
> ovellum` / `pnpm update ovellum` will pick up `0.9.x` patches but **won't move
> you to `0.10.0`**. Installing `ovellum@latest` rewrites the range and gets you
> the newest release. (`ovellum upgrade` does this for you.)

For a **global** install, upgrade it the same way you installed it:
`npm install -g ovellum@latest` (swap in your package manager).

### Global vs. project-local

Because `ovellum upgrade` prefers a declared local dependency, the old footgun —
a bare `ovellum upgrade` silently bumping the *global* install while the project
stayed pinned — no longer bites inside a normal project. The check it makes is
simply "does this directory's `package.json` mention `ovellum`?"; if so, the
project wins.

Two edge cases to know:

- **A project with no declared dependency.** If `ovellum` isn't in the
  directory's `package.json` and isn't in `node_modules`, `upgrade` treats it as
  a global install. Add it to the project first (`npm install -D ovellum`) and
  re-run.
- **You genuinely want to bump the global.** Run `upgrade` from a directory that
  isn't an Ovellum project, or install by hand: `npm install -g ovellum@latest`.

To sanity-check which copy you're on:

```bash
grep ovellum package.json          # the project's pinned range
npx ovellum --version              # `npx` runs the LOCAL copy
```

> **Pushing to CI?** Commit the updated `package.json` **and** the lockfile
> (`package-lock.json` / `pnpm-lock.yaml` / `yarn.lock` / `bun.lock`). A CI step
> like `npm ci` installs strictly from the lockfile, so a stale or missing
> lockfile means CI builds with the old Ovellum (or fails on the mismatch).

Ovellum follows semver. Pre-1.0, **minor** versions may include breaking
changes — skim the [release notes](https://github.com/oinam/ovellum/releases)
before bumping.

## Uninstalling

```bash
pnpm remove ovellum
```

The output directory (`dist/`, `docs/`, or wherever you pointed `output`)
is yours; uninstalling Ovellum leaves it untouched. You can delete it
manually whenever you're ready.
