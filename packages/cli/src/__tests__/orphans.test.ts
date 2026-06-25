import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, type DocNode, type OrphanRecord } from '@ovellum/core';
import { renderOrphanFile, writeOrphan } from '@ovellum/merger';
import { runBuild } from '../dev/run-build.js';
import {
  loadOrphans,
  parseOrphanFile,
  reattachOrphan,
  suggestReattachTarget,
  summarizeOrphans,
} from '../dev/orphans.js';

function node(id: string, name: string): DocNode {
  return {
    id,
    kind: 'function',
    name,
    filePath: id.slice(0, id.indexOf('::')),
    line: 1,
    signature: `function ${name}()`,
    tags: {},
    isExported: true,
    isInternal: false,
    isPreserved: false,
  };
}

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

describe('suggestReattachTarget', () => {
  const orphan: OrphanRecord = {
    orphanedAt: '2026-06-01T00:00:00.000Z',
    sourceFile: 'docs/date.md',
    anchorId: 'src/date.ts::formatDate',
    content: 'note',
  };

  it('prefers the exact anchor when it is back in source', () => {
    const s = suggestReattachTarget(orphan, [node('src/date.ts::formatDate', 'formatDate')]);
    expect(s).toEqual({ anchorId: 'src/date.ts::formatDate', reason: 'present', confidence: 1 });
  });

  it('suggests a name-similar anchor as a likely rename', () => {
    const s = suggestReattachTarget(orphan, [node('src/date.ts::formatDateUTC', 'formatDateUTC')]);
    expect(s?.reason).toBe('rename');
    expect(s?.anchorId).toBe('src/date.ts::formatDateUTC');
  });

  it('returns null when nothing is close enough', () => {
    expect(suggestReattachTarget(orphan, [node('src/x.ts::shutdown', 'shutdown')])).toBeNull();
  });
});

describe('reattachOrphan', () => {
  let dir: string;
  const config = { ...DEFAULT_CONFIG, input: './src', output: './docs', mode: 'hybrid' as const };

  beforeEach(async () => {
    dir = mkdtempSync(path.join(tmpdir(), 'ovellum-reattach-'));
    mkdirSync(path.join(dir, 'src'), { recursive: true });
    writeFileSync(
      path.join(dir, 'src', 'math.ts'),
      '/** Add. */\nexport function add(a: number, b: number): number {\n  return a + b;\n}\n',
      'utf8',
    );
    await runBuild({ config, cwd: dir });
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('writes the prose into a @manual zone under the target and removes the archive', async () => {
    const orphanDir = path.resolve(dir, config.protect.orphanDir);
    await writeOrphan(
      {
        orphanedAt: '2026-06-01T00:00:00.000Z',
        sourceFile: 'docs/math.md',
        anchorId: 'src/math.ts::add',
        manualBlockId: 'why',
        content: 'Kept rationale.',
      },
      orphanDir,
    );
    const [orphan] = await loadOrphans(orphanDir);
    const archive = orphan!.archivePath!;

    const result = await reattachOrphan({ orphan: orphan!, targetAnchorId: 'src/math.ts::add', config, cwd: dir });
    expect(result.action).toBe('inserted');

    const doc = readFileSync(path.join(dir, 'docs', 'math.md'), 'utf8');
    expect(doc).toContain('<!-- @manual:start id="why" -->');
    expect(doc).toContain('Kept rationale.');
    // The orphan archive is consumed.
    expect(existsSync(archive)).toBe(false);
  });

  it('throws when the target anchor is not in the built doc', async () => {
    const orphan: OrphanRecord = {
      orphanedAt: '2026-06-01T00:00:00.000Z',
      sourceFile: 'docs/math.md',
      anchorId: 'src/math.ts::ghost',
      content: 'x',
    };
    await expect(
      reattachOrphan({ orphan, targetAnchorId: 'src/math.ts::ghost', config, cwd: dir }),
    ).rejects.toThrow(/not found/);
  });
});
