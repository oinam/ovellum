import path from 'node:path';
import { defineCommand } from 'citty';
import { ConfigError, loadOvellumConfig } from '@ovellum/core';
import { collectAnchorIds, readProjectIR } from '../dev/ir.js';
import { loadOrphans, summarizeOrphans, type OrphanSummary } from '../dev/orphans.js';

export const orphansCommand = defineCommand({
  meta: {
    name: 'orphans',
    description:
      'List quarantined manual blocks under .ovellum/orphans/ — their provenance, age, and whether their anchor is back in the source.',
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
    stale: {
      type: 'boolean',
      description: 'Show only orphans older than protect.orphanRetention days.',
    },
    json: {
      type: 'boolean',
      description: 'Emit the orphan list as JSON (for CI / tooling).',
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

    const orphanDir = path.resolve(cwd, config.protect.orphanDir);
    const records = await loadOrphans(orphanDir);

    const snapshot = readProjectIR(cwd);
    const currentAnchorIds = snapshot ? collectAnchorIds(snapshot.project) : null;

    const retentionDays = config.protect.orphanRetention;
    let summaries = summarizeOrphans(records, {
      now: new Date(),
      retentionDays,
      currentAnchorIds,
      cwd,
    });
    if (args.stale === true) summaries = summaries.filter((s) => s.stale);

    const orphanDirRel = path.relative(cwd, orphanDir).replace(/\\/g, '/');

    if (args.json === true) {
      process.stdout.write(
        JSON.stringify(
          {
            orphanDir: orphanDirRel,
            retentionDays,
            hasSnapshot: snapshot !== null,
            count: summaries.length,
            orphans: summaries.map((s) => ({
              anchorId: s.record.anchorId,
              sourceFile: s.record.sourceFile,
              manualBlockId: s.record.manualBlockId,
              orphanedAt: s.record.orphanedAt,
              anchorLastSeen: s.record.anchorLastSeen,
              ageDays: s.ageDays,
              stale: s.stale,
              anchor: s.anchor,
              file: s.file,
            })),
          },
          null,
          2,
        ) + '\n',
      );
    } else {
      process.stdout.write(formatOrphans(summaries, { orphanDirRel, retentionDays, stale: args.stale === true }) + '\n');
    }

    process.exit(0);
  },
});

/** Render an orphan summary list as the human-readable stdout block. */
export function formatOrphans(
  summaries: OrphanSummary[],
  opts: { orphanDirRel: string; retentionDays: number; stale: boolean },
): string {
  if (summaries.length === 0) {
    return opts.stale
      ? `ovellum orphans — none older than ${opts.retentionDays} days in ${opts.orphanDirRel}/.`
      : `ovellum orphans — none quarantined in ${opts.orphanDirRel}/.`;
  }

  const noun = summaries.length === 1 ? 'orphan' : 'orphans';
  const scope = opts.stale ? ` older than ${opts.retentionDays} days` : '';
  const lines = [`ovellum orphans — ${summaries.length} ${noun}${scope} in ${opts.orphanDirRel}/`, ''];

  for (const s of summaries) {
    const age = s.ageDays === 0 ? 'today' : s.ageDays === 1 ? '1 day ago' : `${s.ageDays} days ago`;
    const anchor =
      s.anchor === 'present'
        ? 'present again in source — reattachable'
        : s.anchor === 'gone'
          ? 'gone from current source'
          : 'unknown (no IR snapshot — run `ovellum build`)';
    lines.push(`  ${s.record.anchorId}`);
    lines.push(`    orphaned:   ${s.record.orphanedAt} (${age}${s.stale ? ', stale' : ''})`);
    if (s.record.anchorLastSeen) lines.push(`    last seen:  ${s.record.anchorLastSeen}`);
    lines.push(`    doc:        ${s.record.sourceFile}`);
    if (s.record.manualBlockId) lines.push(`    block id:   ${s.record.manualBlockId}`);
    lines.push(`    anchor:     ${anchor}`);
    lines.push(`    file:       ${s.file}`);
    lines.push('');
  }
  // Drop the trailing blank line.
  if (lines[lines.length - 1] === '') lines.pop();
  return lines.join('\n');
}
