import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Best-effort detection of how `ovellum` was installed, so the notice and the
 * `upgrade` command can suggest (and run) the *right* command. This is a
 * heuristic, not gospel — when in doubt it falls back to global npm, the most
 * common way a CLI is installed.
 */

export type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun';

export interface InstallInfo {
  manager: PackageManager;
  /** True when the upgrade should target the project's local dependency rather
   *  than a global install — see {@link isLocalInstall}. */
  local: boolean;
  /** The exact command a user should run to upgrade. */
  command: string;
}

/** Parse the package manager from npm's `npm_config_user_agent` env string
 *  (format: `"pnpm/8.0.0 npm/? node/v20…"`). Defaults to npm. */
export function detectManager(userAgent = process.env.npm_config_user_agent): PackageManager {
  const head = (userAgent ?? '').split('/', 1)[0]?.toLowerCase();
  if (head === 'pnpm' || head === 'yarn' || head === 'bun') return head;
  return 'npm';
}

/** Detect the package manager a *project* uses from its lockfile. A bare global
 *  `ovellum` binary carries no `npm_config_user_agent`, so for a local upgrade
 *  the project's own lockfile is the more reliable signal than the ambient
 *  env. Returns null when no lockfile is found. */
export function detectManagerFromLockfile(cwd = process.cwd()): PackageManager | null {
  if (existsSync(path.join(cwd, 'pnpm-lock.yaml'))) return 'pnpm';
  if (existsSync(path.join(cwd, 'yarn.lock'))) return 'yarn';
  if (existsSync(path.join(cwd, 'bun.lockb')) || existsSync(path.join(cwd, 'bun.lock'))) return 'bun';
  if (existsSync(path.join(cwd, 'package-lock.json'))) return 'npm';
  return null;
}

/** Whether the project at `cwd` *declares* ovellum as a dependency in its
 *  package.json (dependencies / devDependencies / optionalDependencies). This
 *  is the authoritative signal: a project can declare ovellum before its
 *  `node_modules` is populated, and — crucially — running the *global* binary
 *  inside such a project should still upgrade the project's pinned range, not
 *  the global install. */
export function declaresLocalDependency(cwd = process.cwd()): boolean {
  try {
    const pkg = JSON.parse(readFileSync(path.join(cwd, 'package.json'), 'utf8')) as {
      dependencies?: Record<string, unknown>;
      devDependencies?: Record<string, unknown>;
      optionalDependencies?: Record<string, unknown>;
    };
    return Boolean(
      pkg.dependencies?.ovellum ?? pkg.devDependencies?.ovellum ?? pkg.optionalDependencies?.ovellum,
    );
  } catch {
    // No package.json, or it isn't valid JSON — not a local-dependency project.
    return false;
  }
}

/** Whether `ovellum` is physically present in the project's local
 *  node_modules. */
export function isInstalledLocally(cwd = process.cwd()): boolean {
  return existsSync(path.join(cwd, 'node_modules', 'ovellum', 'package.json'));
}

/** Whether an upgrade should target the project's local dependency rather than
 *  a global install. True when the project either *declares* ovellum in its
 *  package.json or already has it in node_modules — so invoking the global
 *  binary from inside such a project upgrades the project (almost always what
 *  the user means), instead of silently bumping the unrelated global. */
export function isLocalInstall(cwd = process.cwd()): boolean {
  return declaresLocalDependency(cwd) || isInstalledLocally(cwd);
}

/** The upgrade command for a manager + scope. */
export function upgradeCommand(manager: PackageManager, local: boolean): string {
  const pkg = 'ovellum@latest';
  if (local) {
    switch (manager) {
      case 'pnpm':
        return `pnpm add -D ${pkg}`;
      case 'yarn':
        return `yarn add -D ${pkg}`;
      case 'bun':
        return `bun add -d ${pkg}`;
      default:
        return `npm install -D ${pkg}`;
    }
  }
  switch (manager) {
    case 'pnpm':
      return `pnpm add -g ${pkg}`;
    case 'yarn':
      return `yarn global add ${pkg}`;
    case 'bun':
      return `bun add -g ${pkg}`;
    default:
      return `npm install -g ${pkg}`;
  }
}

export function detectInstall(cwd = process.cwd()): InstallInfo {
  const local = isLocalInstall(cwd);
  // For a local upgrade, trust the project's lockfile over the ambient
  // user-agent — a global binary invoked directly carries no user-agent, so
  // `detectManager()` alone would always say npm even in a pnpm/yarn project.
  const manager = local ? (detectManagerFromLockfile(cwd) ?? detectManager()) : detectManager();
  return { manager, local, command: upgradeCommand(manager, local) };
}
