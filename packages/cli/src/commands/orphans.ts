import path from 'node:path';
import { confirm, input, select } from '@inquirer/prompts';
import { defineCommand } from 'citty';
import { ConfigError, loadOvellumConfig, type OvellumConfig } from '@ovellum/core';
import { collectAnchorIds, collectNodes, readProjectIR } from '../dev/ir.js';
import {
  deleteOrphan,
  loadOrphans,
  reattachOrphan,
  suggestReattachTarget,
  summarizeOrphans,
  type OrphanSummary,
} from '../dev/orphans.js';

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
    reattach: {
      type: 'boolean',
      description:
        'Interactively reattach each orphan to a present-again / renamed anchor, delete it, or skip.',
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

    if (args.reattach === true) {
      await reattachFlow({ config, cwd, orphanDir });
      return;
    }

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

/** Interactive `--reattach`: walk each orphan and reattach / delete / skip. */
async function reattachFlow(opts: { config: OvellumConfig; cwd: string; orphanDir: string }): Promise<void> {
  const { config, cwd, orphanDir } = opts;
  const records = await loadOrphans(orphanDir);
  const orphanDirRel = path.relative(cwd, orphanDir).replace(/\\/g, '/');
  if (records.length === 0) {
    process.stdout.write(`ovellum orphans — none to reattach in ${orphanDirRel}/.\n`);
    process.exit(0);
  }

  const snapshot = readProjectIR(cwd);
  if (!snapshot) {
    process.stderr.write(
      'no IR snapshot at .ovellum/ir.json — run `ovellum build` first so reattach knows the current anchors.\n',
    );
    process.exit(1);
  }
  const nodes = collectNodes(snapshot.project);
  const anchorIds = new Set(nodes.map((n) => n.id));

  if (!process.stdin.isTTY) {
    process.stderr.write('`ovellum orphans --reattach` is interactive — run it in a terminal.\n');
    process.exit(1);
  }

  let reattached = 0;
  let deleted = 0;
  let skipped = 0;
  try {
    for (const orphan of records) {
      const suggestion = suggestReattachTarget(orphan, nodes);
      const preview = orphan.content.split('\n')[0]?.slice(0, 72) ?? '';
      process.stdout.write(
        `\n${orphan.anchorId}\n  from: ${orphan.sourceFile}\n  text: ${preview}${preview.length >= 72 ? '…' : ''}\n`,
      );

      const choices: Array<{ name: string; value: string }> = [];
      if (suggestion) {
        const tag = suggestion.reason === 'present' ? 'anchor is back' : `likely rename, ${Math.round(suggestion.confidence * 100)}%`;
        choices.push({ name: `Reattach to ${suggestion.anchorId}  (${tag})`, value: 'suggested' });
      }
      choices.push(
        { name: 'Reattach to a different anchor…', value: 'other' },
        { name: 'Delete this orphan', value: 'delete' },
        { name: 'Skip', value: 'skip' },
      );

      const choice = await select({ message: 'Action', choices, default: 'skip' });

      try {
        if (choice === 'suggested' && suggestion) {
          const r = await reattachOrphan({ orphan, targetAnchorId: suggestion.anchorId, config, cwd });
          process.stdout.write(`  ✓ ${r.action} into ${r.doc}\n`);
          reattached++;
        } else if (choice === 'other') {
          const target = await input({
            message: 'Anchor id to reattach under',
            validate: (v) => anchorIds.has(v.trim()) || 'Not a known anchor in the current snapshot.',
          });
          const r = await reattachOrphan({ orphan, targetAnchorId: target.trim(), config, cwd });
          process.stdout.write(`  ✓ ${r.action} into ${r.doc}\n`);
          reattached++;
        } else if (choice === 'delete') {
          const sure = await confirm({ message: 'Delete this orphan permanently?', default: false });
          if (sure) {
            await deleteOrphan(orphan);
            process.stdout.write('  ✓ deleted\n');
            deleted++;
          } else {
            skipped++;
          }
        } else {
          skipped++;
        }
      } catch (err) {
        process.stderr.write(`  ! ${(err as Error).message}\n`);
        skipped++;
      }
    }
  } catch (err) {
    // @inquirer throws ExitPromptError on Ctrl-C — treat as a clean abort.
    if (err instanceof Error && err.name === 'ExitPromptError') {
      process.stdout.write(`\nStopped. reattached ${reattached}, deleted ${deleted}, skipped ${skipped}.\n`);
      process.exit(130);
    }
    throw err;
  }

  process.stdout.write(`\nDone — reattached ${reattached}, deleted ${deleted}, skipped ${skipped}.\n`);
  process.exit(0);
}

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
