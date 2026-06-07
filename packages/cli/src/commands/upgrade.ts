import { spawn } from 'node:child_process';
import { confirm } from '@inquirer/prompts';
import { defineCommand } from 'citty';
import { detectInstall } from '../update/install.js';
import { fetchLatestVersion } from '../update/registry.js';
import { isNewer } from '../update/semver.js';

// Replaced at build time by tsup `define` with the version from package.json.
declare const __OVELLUM_VERSION__: string;

export const upgradeCommand = defineCommand({
  meta: {
    name: 'upgrade',
    description: 'Check npm for a newer Ovellum and install it.',
  },
  args: {
    'dry-run': {
      type: 'boolean',
      description: 'Print the upgrade command without running it.',
    },
    yes: {
      type: 'boolean',
      alias: 'y',
      description: 'Run the upgrade without the confirmation prompt.',
    },
  },
  async run({ args }) {
    const current = __OVELLUM_VERSION__;

    const latest = await fetchLatestVersion(5000);
    if (!latest) {
      process.stderr.write('Could not reach the npm registry to check for updates.\n');
      process.exit(1);
    }

    if (!isNewer(current, latest)) {
      process.stdout.write(`ovellum ${current} is already the latest.\n`);
      return;
    }

    const { command } = detectInstall();
    process.stdout.write(`Update available: ${current} → ${latest}\n`);

    if (args['dry-run']) {
      process.stdout.write(`Run to upgrade: ${command}\n`);
      return;
    }

    // A confirmation guards an action that touches the user's environment
    // (and may need elevated permissions for a global install).
    if (process.stdout.isTTY && !args.yes) {
      let go: boolean;
      try {
        go = await confirm({ message: `Run \`${command}\`?`, default: true });
      } catch (err) {
        if (err instanceof Error && err.name === 'ExitPromptError') {
          process.stderr.write('Cancelled.\n');
          process.exit(130);
        }
        throw err;
      }
      if (!go) {
        process.stdout.write(`Skipped. Run \`${command}\` when ready.\n`);
        return;
      }
    } else if (!process.stdout.isTTY && !args.yes) {
      // Non-interactive without --yes: don't silently mutate the environment.
      process.stdout.write(`Run to upgrade: ${command}\n`);
      return;
    }

    const code = await run(command);
    process.exit(code);
  },
});

/** Spawn the upgrade command, streaming its output. The command is built from
 *  a fixed manager/package allowlist (never user input), so `shell: true` is
 *  safe and lets the composed string run as written. */
function run(command: string): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn(command, { stdio: 'inherit', shell: true });
    child.on('close', (code) => resolve(code ?? 0));
    child.on('error', (err) => {
      process.stderr.write(`upgrade failed: ${err.message}\n`);
      resolve(1);
    });
  });
}
