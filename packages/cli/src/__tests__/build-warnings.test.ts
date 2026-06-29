import { describe, expect, it } from 'vitest';
import type { BuildWarning } from '@ovellum/core';
import { countWarnings, orderWarnings, type BuildSummary } from '../dev/run-build.js';
import { buildSummaryToJson, formatBuildSummary } from '../commands/build.js';

const sample: BuildWarning[] = [
  { message: 'sitemap.xml not generated', severity: 'info' },
  { message: 'asset outside the content directory', severity: 'warning' },
  { message: 'drafts excluded', severity: 'info' },
];

describe('B8 build-warning severity (CLI)', () => {
  it('countWarnings splits real problems from notes', () => {
    expect(countWarnings(sample)).toEqual({ warnings: 1, notes: 2 });
    expect(countWarnings([])).toEqual({ warnings: 0, notes: 0 });
  });

  it('orderWarnings surfaces warnings before info, stable within each group', () => {
    const ordered = orderWarnings(sample);
    expect(ordered.map((w) => w.severity)).toEqual(['warning', 'info', 'info']);
    // Info entries keep their original relative order.
    expect(ordered[1].message).toBe('sitemap.xml not generated');
    expect(ordered[2].message).toBe('drafts excluded');
  });

  it('formatBuildSummary counts warnings and shows a notes line only when present', () => {
    const base: BuildSummary = {
      mode: 'manual',
      elapsedMs: 5,
      warnings: sample,
      outputDir: 'dist',
      pages: [],
      landingRendered: false,
    };
    const out = formatBuildSummary(base, undefined);
    expect(out).toMatch(/warnings:\s+1/);
    expect(out).toMatch(/notes:\s+2/);

    // No info → no notes line.
    const clean = formatBuildSummary({ ...base, warnings: [sample[1]] }, undefined);
    expect(clean).toMatch(/warnings:\s+1/);
    expect(clean).not.toMatch(/notes:/);
  });

  it('buildSummaryToJson passes warnings through as tagged objects', () => {
    const json = buildSummaryToJson(
      { mode: 'manual', elapsedMs: 1, warnings: sample, outputDir: 'dist', pages: [] },
      undefined,
    );
    expect(json.warnings).toEqual(sample);
  });
});
