import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '@ovellum/core';
import { createIncrementalParser } from '../parse.js';

/**
 * Incremental parser (ROADMAP A7): a warm ts-morph Project that re-parses only
 * changed files and reports which DocFiles actually changed.
 */

describe('createIncrementalParser', () => {
  let cwd: string;
  const write = (name: string, body: string) => writeFileSync(path.join(cwd, 'src', name), body, 'utf8');
  const abs = (name: string) => path.join(cwd, 'src', name);

  beforeEach(() => {
    cwd = mkdtempSync(path.join(tmpdir(), 'ovellum-inc-'));
    mkdirSync(path.join(cwd, 'src'));
    write('a.ts', '/** Alpha. */\nexport function alpha(): number {\n  return 1;\n}\n');
    write('b.ts', '/** Beta. */\nexport function beta(): number {\n  return 2;\n}\n');
  });
  afterEach(() => rmSync(cwd, { recursive: true, force: true }));

  it('parses the whole project up front', () => {
    const p = createIncrementalParser({ config: { ...DEFAULT_CONFIG }, cwd });
    expect(p.project.files.map((f) => f.filePath)).toEqual(['src/a.ts', 'src/b.ts']);
  });

  it('reports only the changed file as affected', () => {
    const p = createIncrementalParser({ config: { ...DEFAULT_CONFIG }, cwd });
    write('a.ts', '/** Alpha, revised. */\nexport function alpha(x: number): number {\n  return x;\n}\n');
    const { affected, project } = p.update({ changed: [abs('a.ts')] });
    expect(affected).toEqual(['src/a.ts']);
    const alpha = project.files.find((f) => f.filePath === 'src/a.ts')!.nodes[0];
    expect(alpha.signature).toContain('x: number');
  });

  it('returns no affected files when nothing meaningful changed', () => {
    const p = createIncrementalParser({ config: { ...DEFAULT_CONFIG }, cwd });
    // Re-touch a.ts with the same content → IR identical → not affected.
    write('a.ts', '/** Alpha. */\nexport function alpha(): number {\n  return 1;\n}\n');
    expect(p.update({ changed: [abs('a.ts')] }).affected).toEqual([]);
  });

  it('picks up a brand-new file that matches the globs', () => {
    const p = createIncrementalParser({ config: { ...DEFAULT_CONFIG }, cwd });
    write('c.ts', '/** Gamma. */\nexport function gamma(): number {\n  return 3;\n}\n');
    const { affected, project } = p.update({ changed: [abs('c.ts')] });
    expect(affected).toEqual(['src/c.ts']);
    expect(project.files.map((f) => f.filePath)).toContain('src/c.ts');
  });

  it('drops a removed file from the project', () => {
    const p = createIncrementalParser({ config: { ...DEFAULT_CONFIG }, cwd });
    rmSync(abs('b.ts'));
    const { project } = p.update({ removed: [abs('b.ts')] });
    expect(project.files.map((f) => f.filePath)).toEqual(['src/a.ts']);
  });
});
