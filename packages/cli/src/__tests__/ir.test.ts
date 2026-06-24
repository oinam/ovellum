import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, type DocProject, type OvellumConfig } from '@ovellum/core';
import { runBuild } from '../dev/run-build.js';
import { IR_FORMAT, type PersistedIR } from '../dev/ir.js';

/**
 * IR persistence (ROADMAP A1): every auto/hybrid build writes the parsed
 * `DocProject` to `<cwd>/.ovellum/ir.json` as build state — the foundation for
 * `ovellum diff`, rename detection, and anchor last-seen tracking. The snapshot
 * lives at the project root (beside `.ovellum/orphans/`), never inside the
 * built output, and is unaffected by `--out`.
 */

function readIR(cwd: string): PersistedIR {
  const irPath = path.join(cwd, '.ovellum', 'ir.json');
  return JSON.parse(readFileSync(irPath, 'utf8')) as PersistedIR;
}

describe('IR persistence', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'ovellum-ir-'));
    mkdirSync(path.join(dir, 'src'), { recursive: true });
    writeFileSync(
      path.join(dir, 'src', 'math.ts'),
      [
        '/** Add two numbers. */',
        'export function add(a: number, b: number): number {',
        '  return a + b;',
        '}',
        '',
        '/** Subtract b from a. */',
        'export function sub(a: number, b: number): number {',
        '  return a - b;',
        '}',
        '',
      ].join('\n'),
      'utf8',
    );
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('writes .ovellum/ir.json after a hybrid build and reports it in the summary', async () => {
    const summary = await runBuild({ config: { ...DEFAULT_CONFIG }, cwd: dir });

    expect(summary.irPath).toBe('.ovellum/ir.json');
    expect(existsSync(path.join(dir, '.ovellum', 'ir.json'))).toBe(true);
  });

  it('persists a well-formed envelope wrapping the parsed DocProject', async () => {
    await runBuild({ config: { ...DEFAULT_CONFIG }, cwd: dir });

    const ir = readIR(dir);
    expect(ir.generator).toBe('ovellum');
    expect(ir.format).toBe(IR_FORMAT);
    expect(typeof ir.version).toBe('string');

    const project: DocProject = ir.project;
    expect(typeof project.generatedAt).toBe('string');
    // generatedAt is a valid ISO-8601 timestamp.
    expect(Number.isNaN(Date.parse(project.generatedAt))).toBe(false);

    const names = project.files
      .flatMap((f) => f.nodes)
      .map((n) => n.name)
      .sort();
    expect(names).toContain('add');
    expect(names).toContain('sub');
  });

  it('reflects source changes on the next build (the basis for diff)', async () => {
    await runBuild({ config: { ...DEFAULT_CONFIG }, cwd: dir });
    const before = readIR(dir).project.files.flatMap((f) => f.nodes).map((n) => n.name);
    expect(before).toContain('add');

    // Remove `add`; rebuild. The persisted IR must drop it.
    writeFileSync(
      path.join(dir, 'src', 'math.ts'),
      ['/** Subtract b from a. */', 'export function sub(a: number, b: number): number {', '  return a - b;', '}', ''].join('\n'),
      'utf8',
    );
    await runBuild({ config: { ...DEFAULT_CONFIG }, cwd: dir });

    const after = readIR(dir).project.files.flatMap((f) => f.nodes).map((n) => n.name);
    expect(after).not.toContain('add');
    expect(after).toContain('sub');
  });

  it('keeps the IR at the project root even when --out redirects the build', async () => {
    const summary = await runBuild({ config: { ...DEFAULT_CONFIG }, cwd: dir, outDir: 'preview' });

    // The snapshot stays at <cwd>/.ovellum/, not inside the throwaway out dir.
    expect(summary.irPath).toBe('.ovellum/ir.json');
    expect(existsSync(path.join(dir, '.ovellum', 'ir.json'))).toBe(true);
    expect(existsSync(path.join(dir, 'preview', '.ovellum', 'ir.json'))).toBe(false);
  });

  it('does not write an IR for a manual-mode build', async () => {
    const manual: OvellumConfig = { ...DEFAULT_CONFIG, mode: 'manual' };
    mkdirSync(path.join(dir, 'content'), { recursive: true });
    writeFileSync(path.join(dir, 'content', 'index.md'), '# Home\n', 'utf8');

    const summary = await runBuild({ config: manual, cwd: dir });

    expect(summary.irPath).toBeUndefined();
    expect(existsSync(path.join(dir, '.ovellum', 'ir.json'))).toBe(false);
  });
});
