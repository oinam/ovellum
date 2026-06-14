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
npx ovellum upgrade        # upgrade THIS project's Ovellum
ovellum upgrade            # upgrade the GLOBAL Ovellum (see the gotcha below)
```

It upgrades **whichever Ovellum you invoke**, so from inside a project run
`npx ovellum upgrade` (or an npm script) — that targets the project's local copy.
A bare `ovellum` runs the global one. Preview with `--dry-run`, or skip the
confirmation with `--yes`. (See the [`upgrade` reference](/docs/reference/cli/#ovellum-upgrade).)
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

For a **global** install, upgrade it the same way you installed it:
`npm install -g ovellum@latest` (swap in your package manager).

### Global vs. project-local — a common gotcha

If you can have **both** a global Ovellum and a project devDependency, it's easy
to upgrade the wrong one. The tell-tale sign:

> `ovellum --version` shows the new version, but the project's `package.json`
> still pins the old one (e.g. `"ovellum": "^0.5.1"`).

That means you upgraded a **global** Ovellum, not the project. A bare `ovellum`
in a shell runs the global binary (a plain shell doesn't put `node_modules/.bin`
on `PATH`), so `ovellum upgrade` bumped the global and left the project untouched.

The reliable fix is to install into the project directly — this rewrites both
`package.json` and the lockfile:

```bash
cd your-project
npm install -D ovellum@latest      # or pnpm/yarn/bun equivalent
```

Then confirm you fixed the project (not the global):

```bash
grep ovellum package.json          # → "ovellum": "^0.10.0"
npx ovellum --version              # `npx` runs the LOCAL copy → the new version
```

To avoid the mix-up entirely: inside a project always invoke Ovellum as
**`npx ovellum …`** (or via an npm script) so you're using the local install,
and consider not keeping a global one at all (`npm rm -g ovellum`).

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
