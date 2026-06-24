import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '@ovellum/core';
import { runBuild } from '../dev/run-build.js';

/**
 * Build-time rename hint (ROADMAP A3): when a protected block is orphaned
 * because its anchor vanished, but a similar symbol appeared the same build,
 * the build warns that the symbol was probably renamed instead of silently
 * quarantining.
 */

describe('build-time rename hint', () => {
  let dir: string;
  let src: string;
  let doc: string;

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'ovellum-rename-'));
    mkdirSync(path.join(dir, 'src'), { recursive: true });
    src = path.join(dir, 'src', 'date.ts');
    doc = path.join(dir, 'docs', 'date.md');
    // A sibling keeps the doc generating after the rename.
    writeFileSync(
      src,
      [
        '/** Format a date. */',
        'export function formatDate(d: Date): string {',
        '  return String(d);',
        '}',
        '',
        '/** Keep. */',
        'export function noop(): void {}',
        '',
      ].join('\n'),
      'utf8',
    );
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('suggests the renamed anchor when a block is orphaned', async () => {
    await runBuild({ config: { ...DEFAULT_CONFIG }, cwd: dir });

    // Author a protected block under the formatDate anchor.
    let body = readFileSync(doc, 'utf8');
    const anchor = body.match(/<!-- ovellum:anchor id="src\/date.ts::formatDate"[^>]*-->/)![0];
    body = body.replace(
      anchor,
      `${anchor}\n<!-- @manual:start id="why" -->\nKeep this rationale.\n<!-- @manual:end -->`,
    );
    writeFileSync(doc, body, 'utf8');
    // Rebuild so the snapshot records formatDate (the last-seen baseline).
    await runBuild({ config: { ...DEFAULT_CONFIG }, cwd: dir });

    // Rename formatDate → formatDateUTC (keep the sibling).
    writeFileSync(
      src,
      [
        '/** Format a date. */',
        'export function formatDateUTC(d: Date): string {',
        '  return String(d);',
        '}',
        '',
        '/** Keep. */',
        'export function noop(): void {}',
        '',
      ].join('\n'),
      'utf8',
    );
    const summary = await runBuild({ config: { ...DEFAULT_CONFIG }, cwd: dir });

    expect(summary.orphans).toBeGreaterThanOrEqual(1);
    const hint = summary.warnings.find((w) => w.includes('become'));
    expect(hint, 'expected a rename hint among the warnings').toBeTruthy();
    expect(hint).toContain('src/date.ts::formatDate');
    expect(hint).toContain('src/date.ts::formatDateUTC');
  });
});
