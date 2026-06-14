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

The simplest way is the built-in command — it checks npm for the latest release,
detects how you installed Ovellum (which package manager, project-local vs.
global), and runs the right install for you:

```bash
ovellum upgrade            # for a project-local install, prefix with npx
npx ovellum upgrade
```

Preview without changing anything with `--dry-run`, or skip the confirmation
prompt with `--yes`. (See the [`upgrade` reference](/docs/reference/cli/#ovellum-upgrade).)
Ovellum also prints a one-line *"update available"* notice after commands when a
newer version exists (cached; disable it with `update: { check: false }` in your
config).

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

For a **global** install, upgrade it the same way you installed it —
`ovellum upgrade` handles this automatically, or `npm install -g ovellum@latest`
(swap in your package manager).

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
