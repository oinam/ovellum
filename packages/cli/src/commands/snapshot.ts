import { existsSync } from 'node:fs';
import { cp, readdir } from 'node:fs/promises';
import path from 'node:path';
import { defineCommand } from 'citty';
import { ConfigError, loadOvellumConfig } from '@ovellum/core';

/**
 * `ovellum snapshot <id>` — freeze the current docs as version `<id>`.
 *
 * Copies the latest version's content tree (the versioned dir when
 * `site.versions` is configured, else the content root) into
 * `<input>/<id>/`, then prints the `site.versions` entry to add. The command
 * never edits the config itself — a TypeScript config can't be machine-edited
 * safely, so the config change is always yours to make (and review).
 */

const VERSION_ID = /^[A-Za-z0-9._-]+$/;

export interface SnapshotPlan {
  /** Absolute dir the snapshot copies FROM. */
  sourceAbs: string;
  /** Absolute dir the snapshot copies TO (`<input>/<id>`). */
  targetAbs: string;
  /** Top-level entry names copied (root-source copies skip these — see below). */
  copied: string[];
}

/**
 * Copy the latest content into `<input>/<id>/`. When the source is the
 * content ROOT (unversioned project), the target itself and the resolved
 * output dir (if nested inside input) are skipped; a versioned project copies
 * its latest version's dir wholesale.
 */
export async function performSnapshot(opts: {
  inputAbs: string;
  outputAbs: string;
  latestDir: string | null;
  id: string;
}): Promise<SnapshotPlan> {
  const targetAbs = path.join(opts.inputAbs, opts.id);
  if (opts.latestDir) {
    const sourceAbs = path.join(opts.inputAbs, opts.latestDir);
    await cp(sourceAbs, targetAbs, { recursive: true });
    return { sourceAbs, targetAbs, copied: await topLevel(sourceAbs) };
  }
  const sourceAbs = opts.inputAbs;
  const copied: string[] = [];
  for (const name of await readdir(sourceAbs)) {
    const abs = path.join(sourceAbs, name);
    if (abs === targetAbs || abs === opts.outputAbs) continue;
    await cp(abs, path.join(targetAbs, name), { recursive: true });
    copied.push(name);
  }
  return { sourceAbs, targetAbs, copied };
}

async function topLevel(dir: string): Promise<string[]> {
  return await readdir(dir);
}

export const snapshotCommand = defineCommand({
  meta: {
    name: 'snapshot',
    description:
      'Freeze the current docs as a version: copy the latest content into <input>/<id>/.',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Version id (also the directory and URL prefix), e.g. 1.0 or v2.',
      required: true,
    },
    config: {
      type: 'string',
      description: 'Path to ovellum.config.{ts,js,json} (auto-discovered otherwise).',
    },
    cwd: { type: 'string', description: 'Project root (defaults to the current directory).' },
    force: {
      type: 'boolean',
      default: false,
      description: 'Overwrite an existing <input>/<id>/ directory.',
    },
  },
  async run({ args }) {
    const cwd = path.resolve(args.cwd ?? process.cwd());
    let loaded;
    try {
      loaded = await loadOvellumConfig({ cwd, configFile: args.config });
    } catch (err) {
      if (err instanceof ConfigError) {
        process.stderr.write(`config error: ${err.message}\n`);
        if (err.hint) process.stderr.write(`hint: ${err.hint}\n`);
        process.exit(3);
      }
      throw err;
    }
    const { config } = loaded;

    const id = args.id;
    if (!VERSION_ID.test(id)) {
      process.stderr.write(
        `invalid version id '${id}' — use letters, digits, '.', '_' or '-' only.\n`,
      );
      process.exit(2);
    }

    const inputAbs = path.resolve(cwd, config.input);
    const outputAbs = path.resolve(cwd, config.output);
    const versions = config.site.versions;

    if (versions?.some((v) => v.id === id)) {
      process.stderr.write(
        `'${id}' is already a configured version (site.versions) — pick a new id.\n`,
      );
      process.exit(2);
    }
    const targetAbs = path.join(inputAbs, id);
    if (existsSync(targetAbs) && !args.force) {
      process.stderr.write(
        `${path.relative(cwd, targetAbs)}/ already exists. Pass --force to overwrite.\n`,
      );
      process.exit(2);
    }

    const latest = versions?.length ? (versions.find((v) => v.latest) ?? versions[0]!) : null;
    const plan = await performSnapshot({
      inputAbs,
      outputAbs,
      latestDir: latest ? latest.id : null,
      id,
    });

    const rel = (p: string): string => path.relative(cwd, p).replace(/\\/g, '/');
    const lines = [
      `ovellum snapshot: froze ${rel(plan.sourceAbs)}/ as ${rel(plan.targetAbs)}/`,
      `  copied: ${plan.copied.length} top-level entr${plan.copied.length === 1 ? 'y' : 'ies'}`,
      '',
      'Next: register the version in your config —',
      '',
    ];
    if (latest) {
      lines.push(
        `  site: { versions: [ …existing entries…, { id: '${id}' } ] }`,
        '',
        `New entries serve under /${id}/; the latest version stays at the root.`,
      );
    } else {
      lines.push(
        `  site: {`,
        `    versions: [`,
        `      { id: 'latest', latest: true }, // ← pick your working version's id`,
        `      { id: '${id}' },`,
        `    ],`,
        `  }`,
        '',
        'With site.versions set, EVERY version lives in its own directory —',
        `move your working content into ${config.input}/<latest-id>/ as well.`,
        `The latest version serves at the site root; '${id}' serves under /${id}/.`,
      );
    }
    process.stdout.write(lines.join('\n') + '\n');
  },
});
