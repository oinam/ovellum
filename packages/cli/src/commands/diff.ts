import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { defineCommand } from 'citty';
import { ConfigError, loadOvellumConfig } from '@ovellum/core';
import { parseProject } from '@ovellum/parser';
import { IR_FORMAT, type PersistedIR } from '../dev/ir.js';
import { diffProjects, type IRDiff } from '../dev/diff.js';

export const diffCommand = defineCommand({
  meta: {
    name: 'diff',
    description:
      "Compare current source against the last build's IR snapshot (.ovellum/ir.json). Reports added / removed / changed symbols and which docs would change — writes nothing.",
  },
  args: {
    config: {
      type: 'string',
      description: 'Path to ovellum.config.{ts,js,json}',
    },
    cwd: {
      type: 'string',
      description: 'Project root (defaults to current directory)',
    },
    json: {
      type: 'boolean',
      description: 'Emit the diff as JSON (for CI / tooling).',
    },
    'exit-code': {
      type: 'boolean',
      description: 'Exit 1 when changes are found (git-diff style); default exits 0.',
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

    if (config.mode === 'manual') {
      process.stderr.write(
        'ovellum diff applies to auto / hybrid projects; manual builds parse no source and keep no IR.\n',
      );
      process.exit(0);
    }

    const irPath = path.resolve(cwd, '.ovellum', 'ir.json');
    if (!existsSync(irPath)) {
      process.stderr.write(
        'no IR snapshot at .ovellum/ir.json — run `ovellum build` first to record a baseline.\n',
      );
      process.exit(1);
    }

    let persisted: PersistedIR;
    try {
      persisted = JSON.parse(readFileSync(irPath, 'utf8')) as PersistedIR;
    } catch {
      process.stderr.write(
        'could not parse .ovellum/ir.json (corrupt?) — rebuild with `ovellum build`.\n',
      );
      process.exit(1);
    }
    if (persisted.format !== IR_FORMAT) {
      process.stderr.write(
        `.ovellum/ir.json was written for IR format ${persisted.format}, this Ovellum expects ${IR_FORMAT} — rebuild with \`ovellum build\`.\n`,
      );
      process.exit(1);
    }

    const current = parseProject({ config, cwd });
    const diff = diffProjects(persisted.project, current, config);

    if (args.json === true) {
      process.stdout.write(
        JSON.stringify(
          { baselineGeneratedAt: persisted.project.generatedAt, ...diff },
          null,
          2,
        ) + '\n',
      );
    } else {
      process.stdout.write(formatDiff(diff, persisted) + '\n');
    }

    process.exit(args['exit-code'] === true && diff.hasChanges ? 1 : 0);
  },
});

/** Render an `IRDiff` as the human-readable stdout block. */
export function formatDiff(diff: IRDiff, persisted: PersistedIR): string {
  const when = persisted.project.generatedAt;
  if (!diff.hasChanges) {
    return `ovellum diff — no changes since the last build (.ovellum/ir.json, ${when}).`;
  }

  const lines = [
    `ovellum diff — current source vs .ovellum/ir.json (built ${when})`,
    '',
    `  + ${diff.added.length} added   - ${diff.removed.length} removed   ~ ${diff.changed.length} changed   → ${diff.renames.length} renamed`,
  ];

  if (diff.renames.length > 0) {
    lines.push('', 'likely renames:');
    for (const r of diff.renames) {
      const pct = Math.round(r.confidence * 100);
      const note = r.signatureChanged ? ', signature changed' : '';
      lines.push(`  → ${r.from.id} → ${r.to.id}  (${pct}%${note})`);
    }
  }

  if (diff.added.length > 0) {
    lines.push('', 'added:');
    for (const s of diff.added) lines.push(`  + ${s.id}  (${s.kind})`);
  }
  if (diff.removed.length > 0) {
    lines.push('', 'removed:');
    for (const s of diff.removed) lines.push(`  - ${s.id}  (${s.kind})`);
  }
  if (diff.changed.length > 0) {
    lines.push('', 'changed:');
    for (const s of diff.changed) lines.push(`  ~ ${s.id}  (${s.kind})  ${s.fields.join(', ')}`);
  }

  lines.push('', 'docs that would change:');
  for (const d of diff.docs) {
    const mark = d.status === 'added' ? '+' : d.status === 'removed' ? '-' : '~';
    lines.push(`  ${mark} ${d.output}  (+${d.added} ~${d.changed} -${d.removed})`);
  }
  return lines.join('\n');
}
