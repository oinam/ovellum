---
"ovellum": minor
---

Add an update notifier and an `ovellum upgrade` command.

After a command finishes, the CLI prints a one-line "update available" notice when a newer version is published on npm. The check is cached per `update.intervalHours` (default 24h) so most runs do no network I/O, and it stays silent in CI, in non-interactive shells, and when `NO_UPDATE_NOTIFIER`, `--no-update-check`, or `update.check: false` are set. It never installs anything and never delays or fails a run.

`ovellum upgrade` performs the explicit install: it checks npm, detects your package manager (npm/pnpm/yarn/bun) and install scope (global vs. local devDependency), shows `current → latest`, and runs the matching install command (`--dry-run` to print only, `--yes` to skip the prompt). Adds an `update` config block (`{ check, intervalHours }`).
