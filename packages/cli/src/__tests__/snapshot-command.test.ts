import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { performSnapshot } from '../commands/snapshot.js';

describe('performSnapshot', () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'ovellum-snapshot-'));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('unversioned: copies the content root into <input>/<id>, skipping the target itself', async () => {
    const input = path.join(dir, 'content');
    mkdirSync(path.join(input, 'guides'), { recursive: true });
    writeFileSync(path.join(input, 'index.md'), '# Home\n');
    writeFileSync(path.join(input, 'guides', 'a.md'), '# A\n');

    const plan = await performSnapshot({
      inputAbs: input,
      outputAbs: path.join(dir, 'dist'),
      latestDir: null,
      id: '1.0',
    });

    expect(plan.copied.sort()).toEqual(['guides', 'index.md']);
    expect(readFileSync(path.join(input, '1.0', 'index.md'), 'utf8')).toBe('# Home\n');
    expect(readFileSync(path.join(input, '1.0', 'guides', 'a.md'), 'utf8')).toBe('# A\n');
    // The snapshot dir must not recurse into itself.
    expect(existsSync(path.join(input, '1.0', '1.0'))).toBe(false);
  });

  it('unversioned: skips an output dir nested inside input', async () => {
    const input = path.join(dir, 'content');
    const output = path.join(input, 'dist');
    mkdirSync(output, { recursive: true });
    writeFileSync(path.join(input, 'index.md'), '# Home\n');
    writeFileSync(path.join(output, 'index.html'), '<html></html>');

    const plan = await performSnapshot({
      inputAbs: input,
      outputAbs: output,
      latestDir: null,
      id: 'v1',
    });

    expect(plan.copied).toEqual(['index.md']);
    expect(existsSync(path.join(input, 'v1', 'dist'))).toBe(false);
  });

  it('versioned: copies the latest version dir wholesale', async () => {
    const input = path.join(dir, 'content');
    mkdirSync(path.join(input, '2.0'), { recursive: true });
    mkdirSync(path.join(input, '1.0'), { recursive: true });
    writeFileSync(path.join(input, '2.0', 'index.md'), '# Two\n');
    writeFileSync(path.join(input, '1.0', 'index.md'), '# One\n');

    const plan = await performSnapshot({
      inputAbs: input,
      outputAbs: path.join(dir, 'dist'),
      latestDir: '2.0',
      id: '2.0-lts',
    });

    expect(plan.sourceAbs).toBe(path.join(input, '2.0'));
    expect(readFileSync(path.join(input, '2.0-lts', 'index.md'), 'utf8')).toBe('# Two\n');
    // Sibling versions are untouched and not dragged along.
    expect(existsSync(path.join(input, '2.0-lts', '1.0'))).toBe(false);
  });
});
