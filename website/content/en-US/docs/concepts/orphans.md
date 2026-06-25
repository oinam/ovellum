---
title: Orphans
description: What happens to your prose when the symbol it documents goes away.
---

# Orphans

The hardest part of mixing auto-generated and hand-written documentation
isn't the writing. It's what happens when the code moves.

When you rename a function, delete a class, or restructure a module, the
auto-generated docs follow along — they're regenerated from scratch every
build. But what about the hand-written notes you'd attached to the old
shape of the code? Most tools either silently overwrite them or require you
to find and migrate every block yourself before the next build will pass.

Ovellum treats your prose as **valuable**. If it can't find a home for a
[protected zone](/docs/concepts/anchors-and-zones/) on the next build, the
block doesn't get dropped. It gets **quarantined**.

## What quarantine looks like

When the merger sees a protected zone whose anchor no longer exists in the
fresh IR, it writes that zone to a file under `.ovellum/orphans/`:

```
.ovellum/orphans/
  2026-05-15_src-format.ts-padZero.md
  2026-05-13_src-User.ts-User.constructor.md
```

Each file has full provenance frontmatter:

```yaml
---
orphaned: 2026-05-15T14:32:17.493Z
source_file: docs/utils/format.md
anchor_id: src/utils/format.ts::padZero
manual_block_id: rationale
---

**Note.** We use `String#padStart` here instead of a manual loop because
V8 intrinsifies it and the manual version showed up in flamegraphs.
```

You see the orphan in the build summary too:

```
ovellum build complete in 219ms
  ...
  orphans:   1
  quarantined:
    ↪ .ovellum/orphans/2026-05-15_src-format.ts-padZero.md
```

## What to do with an orphan

Once you've reviewed an orphan file, you have three options:

### 1. Re-attach to a new anchor

The symbol was renamed; the prose is still useful. Open the orphan file,
copy the body into the new symbol's Markdown section as a
`<!-- @manual:start -->` block, then delete the orphan file.

When a block is orphaned by a rename, the build often spots it for you —
"did `formatDate` become `formatDateUTC`?" — and
[`ovellum diff`](/docs/reference/cli/#ovellum-diff) pairs the two as a likely
rename. To do the re-attach,
[`ovellum orphans --reattach`](/docs/reference/cli/#reattaching---reattach) walks
each orphan and offers to splice it back under the suggested (or a chosen)
anchor as a protected zone, then removes the archive — no copy-paste.

### 2. Delete it

The symbol genuinely went away. The note doesn't apply anywhere any more.
Delete the orphan file. Git history keeps the record if you ever need it.

### 3. Leave it

Sometimes you'll want to keep the note around for context even if it has
no current home — a postmortem about a removed code path, a design note
about a deprecated API. Leave the orphan file where it is; commit it like
any other file.

## Why `.ovellum/orphans/` is committed

This is intentional. Orphan files are Markdown — human-readable, diffable,
reviewable in PRs. Committing them means:

- Your team-mate reviewing a PR can see when you deleted a function and
  notice the orphaned prose at the same time.
- You can grep your repo for past notes that are no longer attached to
  live symbols.
- Recovery is just `git mv` away.

If you'd rather treat orphans as ephemeral, set
[`protect.orphanStrategy`](/docs/reference/config/#protect) to `'warn'` —
the build will surface the warning but won't write a file.

## When orphans pile up

Each orphan file carries an `orphaned:` timestamp.
[`ovellum orphans`](/docs/reference/cli/#ovellum-orphans) lists what's
accumulated — anchor id, the doc it came from, age, and whether the anchor is
back in the source — and `ovellum orphans --stale` flags entries older than
[`protect.orphanRetention`](/docs/reference/config/#protect) days (default
`90`), making a quarterly review easy:

```bash
# Everything quarantined
ovellum orphans

# Just the stale ones, as JSON for a CI check
ovellum orphans --stale --json
```

To act on them, `ovellum orphans --reattach` walks each one interactively and
reattaches it under the suggested anchor, deletes it, or skips — see
[Reattaching](/docs/reference/cli/#reattaching---reattach).
