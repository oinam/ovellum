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

## Verifying the install

After installing, run:

```bash
npx ovellum build --help
```

You should see the synopsis for the `build` subcommand. If you see "command
not found", check that you're inside the project where you installed, and
that your package manager's binaries are on `PATH` (pnpm sometimes needs an
extra `pnpm setup`).

## Upgrading

```bash
pnpm update ovellum
# or:
npm update ovellum
```

Ovellum follows semver. Pre-1.0 releases may include breaking changes on
minor versions; check the [release notes](https://github.com/oinam/ovellum/releases)
before bumping.

## Uninstalling

```bash
pnpm remove ovellum
```

The output directory (`dist/`, `docs/`, or wherever you pointed `output`)
is yours; uninstalling Ovellum leaves it untouched. You can delete it
manually whenever you're ready.
