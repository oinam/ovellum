# Changesets

We use [changesets](https://github.com/changesets/changesets) to manage versioning and the changelog for the public `ovellum` package.

## Adding a changeset

Run `pnpm changeset` and answer the prompts. A markdown file will be written into this directory describing the change. Commit it alongside your PR.

Only the public `ovellum` package is versioned. Internal `@ovellum/*` packages are listed in `ignore` in `config.json` and do not need changeset entries.

## Releasing

On merge to `main`, the release workflow runs `changeset version` to bump versions and update the changelog, then `changeset publish` to push to npm.
