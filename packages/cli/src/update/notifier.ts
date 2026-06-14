import path from 'node:path';
import { loadOvellumConfig } from '@ovellum/core';
import { readUpdateCache, writeUpdateCache } from './cache.js';
import { detectInstall } from './install.js';
import { fetchLatestVersion } from './registry.js';
import { isNewer } from './semver.js';

/**
 * Print a one-line "update available" notice after a command completes, when
 * the running CLI is behind the latest published version. Design goals:
 *
 *  - Never blocks or delays normal runs: the cached result is shown instantly,
 *    and the network is only touched once per `update.intervalHours`.
 *  - Never installs anything (that's `ovellum upgrade`) and never crashes the
 *    CLI — every failure path is swallowed.
 *  - Stays quiet where notices are unwelcome: CI, non-interactive shells, when
 *    `NO_UPDATE_NOTIFIER` is set, when `--no-update-check` is passed, when
 *    config sets `update.check: false`, and for the version/help/upgrade
 *    commands themselves.
 */
export async function maybeNotifyUpdate(currentVersion: string): Promise<void> {
  try {
    if (shouldSkip()) return;

    const { check, intervalHours } = await resolveSettings();
    if (!check) return;

    const cache = await readUpdateCache();
    const now = Date.now();
    let latest = cache?.latest;

    const due = !cache || now - cache.lastChecked > intervalHours * 3_600_000;
    if (due) {
      const fresh = await fetchLatestVersion();
      if (fresh) {
        latest = fresh;
        await writeUpdateCache({ lastChecked: now, latest: fresh });
      }
    }

    if (latest && isNewer(currentVersion, latest)) {
      printNotice(currentVersion, latest);
    }
  } catch {
    // A notifier must never be the reason a command "fails".
  }
}

/** Environment / argv gates that suppress the notice entirely. */
function shouldSkip(): boolean {
  if (process.env.NO_UPDATE_NOTIFIER) return true;
  if (process.env.CI) return true;
  if (!process.stdout.isTTY) return true;

  const argv = process.argv.slice(2);
  if (argv.includes('--no-update-check')) return true;
  if (argv.some((a) => ['--version', '-v', '--help', '-h'].includes(a))) return true;

  // Skip for the commands that are about versions themselves.
  const cmd = argv.find((a) => !a.startsWith('-'));
  if (cmd === 'upgrade' || cmd === 'version' || cmd === 'help') return true;

  return false;
}

/** Resolve `update.check` / `update.intervalHours` from the project config,
 *  honoring the same `--cwd` / `--config` the command used. Best-effort:
 *  falls back to defaults if config can't be loaded. */
async function resolveSettings(): Promise<{ check: boolean; intervalHours: number }> {
  try {
    const cwd = path.resolve(argValue('--cwd') ?? process.cwd());
    const { config } = await loadOvellumConfig({ cwd, configFile: argValue('--config') });
    return { check: config.update.check, intervalHours: config.update.intervalHours };
  } catch {
    return { check: true, intervalHours: 24 };
  }
}

/** Read `--flag value` or `--flag=value` from argv. */
function argValue(flag: string): string | undefined {
  const argv = process.argv.slice(2);
  const i = argv.indexOf(flag);
  if (i >= 0 && argv[i + 1] && !argv[i + 1]!.startsWith('-')) return argv[i + 1];
  const eq = argv.find((a) => a.startsWith(`${flag}=`));
  return eq ? eq.slice(flag.length + 1) : undefined;
}

function printNotice(current: string, latest: string): void {
  const { command } = detectInstall();
  const color = Boolean(process.stderr.isTTY) && !process.env.NO_COLOR;
  const dim = (s: string) => (color ? `\x1b[2m${s}\x1b[22m` : s);
  const bold = (s: string) => (color ? `\x1b[1m${s}\x1b[22m` : s);
  const lines = [
    '',
    `  ${dim('Update available')}  ${current} ${dim('→')} ${bold(latest)}`,
    `  ${dim('Run')} ${command} ${dim('— or')} ovellum upgrade`,
    '',
  ];
  process.stderr.write(lines.join('\n') + '\n');
}
