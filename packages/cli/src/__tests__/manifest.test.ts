import { mkdtempSync } from 'node:fs';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { writeDeployManifest, type DeployManifest } from '../dev/manifest.js';

describe('writeDeployManifest', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'ovellum-manifest-'));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('inventories every output file with a hash, sorted, skipping its own dir', async () => {
    await writeFile(path.join(dir, 'index.html'), '<h1>hi</h1>', 'utf8');
    await mkdir(path.join(dir, 'guide'), { recursive: true });
    await writeFile(path.join(dir, 'guide', 'index.html'), '<h1>guide</h1>', 'utf8');
    await writeFile(path.join(dir, 'llms.txt'), '# Site\n', 'utf8');
    // OS junk must never appear in a deploy inventory.
    await writeFile(path.join(dir, '.DS_Store'), 'junk', 'utf8');

    const out = await writeDeployManifest({ outputAbs: dir, generatedAt: new Date(0) });
    expect(out).toBe(path.join(dir, '.ovellum', 'manifest.json'));

    const manifest = JSON.parse(await readFile(out, 'utf8')) as DeployManifest;
    expect(manifest.generator).toBe('ovellum');
    expect(manifest.generatedAt).toBe('1970-01-01T00:00:00.000Z');
    expect(manifest.fileCount).toBe(3);

    const paths = manifest.files.map((f) => f.path);
    expect(paths).toEqual(['guide/index.html', 'index.html', 'llms.txt']); // sorted, POSIX
    // The manifest never lists itself.
    expect(paths.some((p) => p.startsWith('.ovellum/'))).toBe(false);
    // OS junk is excluded.
    expect(paths).not.toContain('.DS_Store');
    // Every entry carries a sha256 and a byte count.
    for (const f of manifest.files) {
      expect(f.sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(f.bytes).toBeGreaterThan(0);
    }
    expect(manifest.totalBytes).toBe(manifest.files.reduce((n, f) => n + f.bytes, 0));
  });

  it('is deterministic for identical input', async () => {
    await writeFile(path.join(dir, 'a.txt'), 'same', 'utf8');
    const at = new Date(0);
    const p1 = await writeDeployManifest({ outputAbs: dir, generatedAt: at });
    const first = await readFile(p1, 'utf8');
    const p2 = await writeDeployManifest({ outputAbs: dir, generatedAt: at });
    const second = await readFile(p2, 'utf8');
    expect(second).toBe(first);
  });
});
