---
title: Versioned docs
description: Publish v1, v2, and next side by side — directory-per-version with a topbar version picker.
tags: [versioning, versions, releases]
---

# Versioned docs

Libraries with maintained majors need their docs to match: a reader on `v1`
should see the `v1` API, not whatever `main` looks like today. Ovellum versions
the docs by **directory** — each version is its own content subtree — and adds a
version picker to the topbar. It's **opt-in**: unversioned sites need no
`content/<id>/` folder and behave exactly as before.

## Enable it

Declare your versions in [`site.versions`](/docs/reference/config/#versions) and
move each version's content into a `content/<id>/` folder:

```ts
export default {
  site: {
    versions: [
      { id: 'v2', label: 'v2 (latest)', latest: true }, // served at /
      { id: 'v1', label: 'v1' },                         // served at /v1/
    ],
  },
} satisfies OvellumUserConfig;
```

```
content/
  v2/                ← latest, served at the root
    index.md
    guides/install.md
  v1/                ← served at /v1/
    index.md
    guides/install.md
```

- **`id`** is both the URL segment and the folder name (`content/v2/`).
- **`label`** is what the picker shows. Defaults to `id`.
- **`latest`** marks the version served at the **root** (`/`) with no prefix.
  Exactly one version may set it; if none does, the first entry wins.

The first build reads each subtree and emits the latest version at the root and
the others under their id:

```
dist/
  index.html                  ← v2 home
  guides/install/index.html   ← v2
  v1/index.html               ← v1 home
  v1/guides/install/index.html
```

## The version picker

When more than one version exists, a picker appears in the topbar (next to the
language picker, if any). Switching versions keeps the reader on the **same
page** in the target version — `/guides/install/` in v2 jumps to
`/v1/guides/install/` — and falls back to that version's home when the page
doesn't exist there. So you can add or drop pages between versions without
producing dead links.

## Cutting a new version

Versioning is just folders, so releasing a new major is a copy and a config
edit — and [`ovellum snapshot`](/docs/reference/cli/#ovellum-snapshot) does the
copy for you:

```bash
npx ovellum snapshot 1.0
```

It freezes the current latest content as `content/1.0/` and prints the
`site.versions` entry to add. (The command never edits your config — a
TypeScript config isn't safely machine-editable, so the config change stays
yours to review.) On a project without `site.versions` yet, it also prints the
one-time migration step: with versions enabled, *every* version lives in its
own directory, so your working content moves into `content/<latest-id>/` too.

Older versions are plain content — freeze them by simply not editing them, or
keep patching them; both are fine.

## Old versions and search engines

Non-latest versions are for readers who arrive on purpose, not for search
traffic — so every non-latest page automatically gets:

- a **banner** above the topbar — "This is documentation for **v1**, not the
  latest version. [Switch to the latest]" — linking to the same page in the
  latest version (localized like the rest of the chrome);
- a `<meta name="robots" content="noindex">`, and
- **exclusion from `sitemap.xml`** (only the latest version is listed).

No configuration; it follows from `site.versions`. The latest version is
untouched.

## With multiple languages

Versions compose with [i18n](/docs/guides/i18n/). When both are set, locales nest
**inside** each version:

```
content/
  v2/
    en-US/docs/install.md   → /docs/install/
    ja/docs/install.md      → /ja/docs/install/
  v1/
    en-US/docs/install.md   → /v1/docs/install/
    ja/docs/install.md      → /v1/ja/docs/install/
```

The language picker switches locale within the current version; the version
picker switches version within the current locale. `hreflang` alternates stay
within a version.

## What you get per version

Each version is a first-class site: its own sidebar nav, `_meta.json` ordering,
and frontmatter. Build artifacts are emitted per version too — RSS and
[`llms.txt`](/docs/guides/automation/) are written per version (the latest at
the root, older ones under their prefix), while `sitemap.xml` lists **only the
latest** (non-latest pages are noindexed — see
[above](#old-versions-and-search-engines)).
