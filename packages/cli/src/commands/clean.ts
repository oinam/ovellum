import { existsSync } from 'node:fs';
import { readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { defineCommand } from 'citty';
import { ConfigError, loadOvellumConfig } from '@ovellum/core';
import { readManualDoc } from '@ovellum/reader';

interface Preserved {
  rel: string;
  reason: string;
}

/** Recursively collect every `.md` file under a directory. */
async function collectMarkdown(dir: string, acc: string[]): Promise<void> {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) await collectMarkdown(abs, acc);
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) acc.push(abs);
  }
}

/** Remove now-empty directories from `dir` upward toward (but excluding) `stopAt`. */
async function pruneEmptyDirs(dir: string, stopAt: string): Promise<void> {
  let cur = dir;
  while (cur.startsWith(stopAt) && cur !== stopAt) {
    try {
      const left = await readdir(cur);
      if (left.length > 0) break;
      await rm(cur, { recursive: false, force: true });
      cur = path.dirname(cur);
    } catch {
      break;
    }
  }
}

export const cleanCommand = defineCommand({
  meta: {
    name: 'clean',
    description:
      'Remove generated output, preserving hand-written files and the orphan archive. Dry-run unless --confirm.',
  },
  args: {
    config: { type: 'string', description: 'Path to ovellum.config.{ts,js,json} (auto-discovered otherwise).' },
    cwd: { type: 'string', description: 'Project root (defaults to the current directory).' },
    confirm: {
      type: 'boolean',
      default: false,
      description: 'Actually delete. Without it, clean is a dry run that lists what it would remove.',
    },
    orphans: {
      type: 'boolean',
      default: false,
      description:
        'Also remove the orphan archive (.ovellum/orphans/). Off by default — those are committed hand-written prose.',
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
    const outputAbs = path.resolve(cwd, config.output);
    const orphanDir = path.resolve(cwd, config.protect.orphanDir);
    const rel = (p: string): string => path.relative(cwd, p).replace(/\\/g, '/') || '.';

    const toRemove: string[] = []; // absolute paths (files, or a whole dir in manual mode)
    const preserved: Preserved[] = [];

    if (!existsSync(outputAbs)) {
      // Nothing built yet — only the orphan archive (handled below) is in play.
    } else if (config.mode === 'manual') {
      // Manual output is 100% generated from `input` (HTML, assets) — safe to
      // remove wholesale; hand-written sources live in `input`, untouched.
      toRemove.push(outputAbs);
    } else {
      // auto / hybrid: output is generated `.md`. Remove files marked
      // `ovellum: true`, but NEVER one that carries a hand-written `@manual`
      // zone (that prose lives only here) — and leave hand-authored files alone.
      const files: string[] = [];
      await collectMarkdown(outputAbs, files);
      for (const file of files) {
        let doc;
        try {
          doc = await readManualDoc(file);
        } catch {
          // Malformed `@manual` tags throw — that's hand-written content; keep it.
          preserved.push({ rel: rel(file), reason: 'has @manual tags (unparseable) — kept' });
          continue;
        }
        if (doc.frontmatter?.ovellum !== true) {
          preserved.push({ rel: rel(file), reason: 'hand-written (no `ovellum: true`)' });
        } else if (doc.protectedBlocks.length > 0) {
          preserved.push({ rel: rel(file), reason: 'contains hand-written @manual prose' });
        } else {
          toRemove.push(file);
        }
      }
    }

    // The orphan archive is committed hand-written prose — preserved unless
    // explicitly requested, so deleting it is always a deliberate choice.
    if (existsSync(orphanDir)) {
      if (args.orphans) toRemove.push(orphanDir);
      else preserved.push({ rel: rel(orphanDir), reason: 'orphan archive (pass --orphans to remove)' });
    }

    // Report.
    if (toRemove.length === 0) {
      process.stdout.write('ovellum clean: nothing to remove.\n');
      for (const p of preserved) process.stdout.write(`  kept ${p.rel}  (${p.reason})\n`);
      return;
    }

    const verb = args.confirm ? 'removed' : 'would remove';
    process.stdout.write(`ovellum clean${args.confirm ? '' : ' (dry run)'}:\n`);
    for (const abs of toRemove) {
      if (args.confirm) await rm(abs, { recursive: true, force: true });
      process.stdout.write(`  ${verb} ${rel(abs)}\n`);
    }
    for (const p of preserved) process.stdout.write(`  kept ${p.rel}  (${p.reason})\n`);

    // Tidy empty directories left behind by per-file removal (auto/hybrid).
    if (args.confirm && config.mode !== 'manual' && existsSync(outputAbs)) {
      for (const abs of toRemove) {
        if (abs !== outputAbs) await pruneEmptyDirs(path.dirname(abs), outputAbs);
      }
    }

    if (!args.confirm) {
      process.stdout.write('\nThis was a dry run. Re-run with --confirm to delete.\n');
    }
  },
});
