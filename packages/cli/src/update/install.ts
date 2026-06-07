import { existsSync } from 'node:fs';
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
  /** True when ovellum lives in the project's local node_modules (a
   *  devDependency) rather than a global install. */
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

/** Whether `ovellum` resolves to a local devDependency under `cwd`. */
export function isLocalInstall(cwd = process.cwd()): boolean {
  return existsSync(path.join(cwd, 'node_modules', 'ovellum', 'package.json'));
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
  const manager = detectManager();
  const local = isLocalInstall(cwd);
  return { manager, local, command: upgradeCommand(manager, local) };
}
