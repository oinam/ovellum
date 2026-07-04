import { mkdtempSync, readdirSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { OrphanRecord } from '@ovellum/core';
import { writeOrphan } from '../orphans.js';

function record(content: string): OrphanRecord {
  return {
    anchorId: 'src/math.ts::add',
    sourceFile: 'docs/math.md',
    orphanedAt: '2026-07-04T10:00:00.000Z',
    content,
  };
}

describe('writeOrphan', () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'ovellum-orphan-'));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('names the file <date>_<slug>.md', async () => {
    const abs = await writeOrphan(record('first'), dir);
    expect(path.basename(abs)).toBe('2026-07-04_src-math.ts-add.md');
  });

  it('never overwrites on a same-day collision — suffixes a counter', async () => {
    const a = await writeOrphan(record('first prose'), dir);
    const b = await writeOrphan(record('second prose'), dir);
    const c = await writeOrphan(record('third prose'), dir);
    expect(path.basename(a)).toBe('2026-07-04_src-math.ts-add.md');
    expect(path.basename(b)).toBe('2026-07-04_src-math.ts-add-2.md');
    expect(path.basename(c)).toBe('2026-07-04_src-math.ts-add-3.md');
    expect(readdirSync(dir).sort()).toHaveLength(3);
  });
});
