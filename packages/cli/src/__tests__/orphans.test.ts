import { mkdtempSync, writeFileSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { OrphanRecord } from '@ovellum/core';
import { renderOrphanFile, writeOrphan } from '@ovellum/merger';
import { loadOrphans, parseOrphanFile, summarizeOrphans } from '../dev/orphans.js';

/**
 * `ovellum orphans` reading + analysis (ROADMAP A4). The merger writes the
 * archive; this side reads it back and rolls up age / staleness /
 * reattachability. A round-trip test binds reader to writer.
 */

const record: OrphanRecord = {
  orphanedAt: '2026-05-15T14:32:17.493Z',
  sourceFile: 'docs/format.md',
  anchorId: 'src/format.ts::padZero',
  anchorLastSeen: '2026-05-10T12:00:00.000Z',
  manualBlockId: 'rationale',
  content: 'We use String#padStart here because V8 intrinsifies it.',
};

describe('parseOrphanFile', () => {
  it('round-trips every field the writer emits', () => {
    const parsed = parseOrphanFile(renderOrphanFile(record));
    expect(parsed).toEqual(record);
  });

  it('handles the minimal record (no optional fields)', () => {
    const minimal: OrphanRecord = {
      orphanedAt: '2026-06-01T00:00:00.000Z',
      sourceFile: 'docs/a.md',
      anchorId: 'src/a.ts::thing',
      content: 'note',
    };
    const parsed = parseOrphanFile(renderOrphanFile(minimal));
    expect(parsed).toEqual(minimal);
    expect(parsed.anchorLastSeen).toBeUndefined();
    expect(parsed.manualBlockId).toBeUndefined();
  });
});

describe('loadOrphans', () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'ovellum-orphans-'));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('returns an empty list when the dir is absent', async () => {
    expect(await loadOrphans(path.join(dir, 'nope'))).toEqual([]);
  });

  it('reads every orphan, sorts oldest-first, and sets archivePath', async () => {
    await writeOrphan({ ...record, orphanedAt: '2026-06-20T00:00:00.000Z', anchorId: 'src/b.ts::late' }, dir);
    await writeOrphan({ ...record, orphanedAt: '2026-01-02T00:00:00.000Z', anchorId: 'src/a.ts::early' }, dir);
    // A stray non-md file must be ignored.
    writeFileSync(path.join(dir, 'README.txt'), 'ignore me', 'utf8');

    const records = await loadOrphans(dir);
    expect(records.map((r) => r.anchorId)).toEqual(['src/a.ts::early', 'src/b.ts::late']);
    expect(records[0].archivePath).toBeTruthy();
  });
});

describe('summarizeOrphans', () => {
  const now = new Date('2026-06-24T00:00:00.000Z');

  it('computes age and flags staleness against the retention window', () => {
    const recent = { ...record, orphanedAt: '2026-06-20T00:00:00.000Z' };
    const old = { ...record, orphanedAt: '2026-01-01T00:00:00.000Z', anchorId: 'src/x.ts::y' };
    const [a, b] = summarizeOrphans([recent, old], {
      now,
      retentionDays: 90,
      currentAnchorIds: null,
      cwd: '/proj',
    });
    expect(a.ageDays).toBe(4);
    expect(a.stale).toBe(false);
    expect(b.ageDays).toBeGreaterThan(90);
    expect(b.stale).toBe(true);
  });

  it('marks an anchor present / gone / unknown against the snapshot', () => {
    const present = summarizeOrphans([record], {
      now,
      retentionDays: 90,
      currentAnchorIds: new Set(['src/format.ts::padZero']),
      cwd: '/proj',
    });
    expect(present[0].anchor).toBe('present');

    const gone = summarizeOrphans([record], {
      now,
      retentionDays: 90,
      currentAnchorIds: new Set(['something/else.ts::other']),
      cwd: '/proj',
    });
    expect(gone[0].anchor).toBe('gone');

    const unknown = summarizeOrphans([record], {
      now,
      retentionDays: 90,
      currentAnchorIds: null,
      cwd: '/proj',
    });
    expect(unknown[0].anchor).toBe('unknown');
  });
});
