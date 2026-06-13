# RELEASE

The canonical runbook for cutting and publishing an `ovellum` release. When
we're ready to ship, open this and run it top to bottom.

Publishing is **local by design** — CI auto-publish is parked (see the
"Parked / deferred" notes in [`TODO.md`](./TODO.md) for the history and the
un-parking plan via npm Trusted Publishers). Each release is a short
hand-driven sequence after a changeset lands. Two steps in this flow can only
be run by the maintainer in an interactive terminal — `npm publish` (npm
session + OTP) and the signed `git tag` (GPG passphrase prompt) — so an agent
can prep everything else but cannot complete a release on its own.

## Prerequisites (one-time)

- **npm**: logged in as `oinam` (`npm whoami` → `oinam`). Publish uses this
  session; no `NPM_TOKEN` is involved.
- **GPG**: a signing key configured. This repo's git config sets
  `tag.gpgSign = true` + `tag.forceSignAnnotated = true`, so a plain
  `git tag <name>` fails with `fatal: no tag message?` — release tags must be
  signed-annotated, which triggers a **pinentry passphrase prompt**. Run the
  tag step in an interactive terminal (not a script/agent).
- A clean working tree on `main`.

## The routine flow

### 1. Author a changeset (with the feature, not at release time)

```sh
pnpm changeset          # pick bump level, describe the user-facing change
```

Commit the generated `.changeset/*.md` alongside the feature. This is what
triggers the version PR. **Author one per user-facing change** — see the
changeset gotchas below for why skipping this bites.

### 2. Let the version PR build

The `Version PR` workflow opens / refreshes a `chore: version packages` PR that
applies the bump and writes `packages/cli/CHANGELOG.md`.

> Local alternative: run `pnpm changeset version` yourself on `main`. **Pick
> exactly one** of "merge the version PR" *or* `pnpm changeset version`
> locally — never both.

### 3. Review and merge the version PR

This commits the bumped `package.json` files and the updated `CHANGELOG.md` to
`main`.

### 4. Publish locally from a clean `main`

```sh
git checkout main && git pull
pnpm -w build
cd packages/cli
npm publish            # OTP prompt → re-run with --otp=<code> if needed
```

`npm publish` auto-runs `prepublishOnly: pnpm -w build`, so `dist/` (gitignored)
is always rebuilt fresh — the explicit `pnpm -w build` above is
belt-and-suspenders.

### 5. Bump the version badge

After `npm publish` succeeds, update **`site.version`** in
`website/ovellum.config.ts` (the field inside the `site:` block, e.g.
`'v0.4.0'`). Commit + push so the deployed site shows the right version next to
the logo.

> ⚠️ Do **not** touch the top-level `version` field (`'0.1.0'` — the
> documented-project version, unused by the manual-mode site; only
> `site.version` drives the badge).

### 6. Tag and push the release

`npm publish` does **not** create tags (only `changeset publish` would, in CI),
so do it by hand. Convention: the tag message **is** the tag name, matching the
existing `ovellum@0.2.x` / `0.3.x` tags.

One self-contained line, run from the **repo root** — `&&`-chained so it's
all-or-nothing, and it reads the version from the package file so there's no
separate variable line to forget and no `cd` to get wrong (a multi-line form
bit the 0.4.0 release: only the `git tag` line got copied, `$v` was empty, and
`git tag -s ""` failed):

```sh
v="ovellum@$(node -p "require('./packages/cli/package.json').version")" && git tag -s "$v" -m "$v" && git push origin "$v"
```

It's signed (triggers the GPG pinentry prompt) and pushes only that one tag. If
signing fails in your shell, see "Failure modes" below.

### 7. GitHub release notes

New release at <https://github.com/oinam/ovellum/releases/new>, attach the
`ovellum@x.y.z` tag, and paste the matching `## x.y.z` section from
`packages/cli/CHANGELOG.md`. The **Full diff** link format is
`https://github.com/oinam/ovellum/compare/ovellum@<prev>...ovellum@<new>`.

## Failure modes

- **`npm publish` OTP** — usually prompts; re-run with `--otp=<code>`. If the
  npm version already matches `package.json`, publish is a no-op (a prior
  attempt succeeded) — continue with steps 5–7.
- **`git push origin ovellum@x.y.z` → `src refspec … does not match any`** — the
  tag was never created locally (the `git tag` step didn't run or errored; see
  the signed-tag note in Prerequisites). Create it first, then push.
- **`git tag -s` fails to sign** — first rule out a partial copy/paste (an empty
  `$v` gives an invalid-tag error, *not* a signing error — use the one-liner in
  step 6). To test signing itself in your shell, clear the agent cache and try a
  throwaway tag:

  ```sh
  echo "GPG_TTY=${GPG_TTY:-<UNSET>}"; gpgconf --kill gpg-agent
  git tag -s _gpgtest -m _gpgtest && { echo OK; git tag -d _gpgtest; } || echo FAILED
  ```

  If it errors with `Inappropriate ioctl for device`, `GPG_TTY` was unset —
  `echo 'export GPG_TTY=$(tty)' >> ~/.zshrc && source ~/.zshrc`. If pinentry is
  missing: `brew install pinentry-mac` and add
  `pinentry-program $(brew --prefix)/bin/pinentry-mac` to `~/.gnupg/gpg-agent.conf`.
  (Verified 2026-06-13: signing itself works on this machine — the 0.4.0 tag
  failure was a partial paste, not a GPG problem.)

## Changeset gotchas (these bit real releases — do them to avoid hand-fixing)

- **The version PR only consumes changesets already on `origin`** when CI runs
  it. A changeset committed locally but not pushed gets left out of that
  release. Push all changesets before the version PR merges — or, if you
  already merged, rebase the stray commit onto the merged `main` and drop/fold
  the orphaned changeset (an unconsumed changeset would otherwise trigger a
  spurious next-patch release).
- **Direct-to-`main` pushes bypass the PR-only changeset guard**, so the
  auto-CHANGELOG under-records the release (happened for 0.2.1 and 0.3.0). When
  it does, flesh out the version's section by hand with an **"### Also in this
  release"** subsection, reconstructed from
  `git log ovellum@<prev>..ovellum@<new>` (filter to commits touching
  `packages/core` / `packages/site/src` / `packages/cli/src` — website-only and
  docs-only commits don't ship in the package).

---

See also: [`TODO-Human.md`](./TODO-Human.md) for other human-only / launch
tasks, and the manual end-to-end smoke tests worth running before a release
(`npx ovellum init` / `build` on the examples, `npm pack` tarball check).
