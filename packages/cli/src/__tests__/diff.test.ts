import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, type DocProject } from '@ovellum/core';
import { parseProject } from '@ovellum/parser';
import { diffProjects } from '../dev/diff.js';

/**
 * `ovellum diff` engine (ROADMAP A2): structural diff between a persisted IR
 * snapshot and a fresh parse of the current source. Symbols match by stable
 * anchor id; cosmetic edits (a blank line above a symbol) must not register.
 */

describe('diffProjects', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'ovellum-diff-'));
    mkdirSync(path.join(dir, 'src'), { recursive: true });
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  function write(file: string, body: string): void {
    writeFileSync(path.join(dir, 'src', file), body, 'utf8');
  }

  function parse(): DocProject {
    return parseProject({ config: { ...DEFAULT_CONFIG }, cwd: dir });
  }

  it('reports no changes when the source is unchanged', () => {
    write('math.ts', '/** Add. */\nexport function add(a: number, b: number): number {\n  return a + b;\n}\n');
    const before = parse();
    const after = parse();
    const diff = diffProjects(before, after, DEFAULT_CONFIG);
    expect(diff.hasChanges).toBe(false);
    expect(diff.added).toHaveLength(0);
    expect(diff.removed).toHaveLength(0);
    expect(diff.changed).toHaveLength(0);
    expect(diff.docs).toHaveLength(0);
  });

  it('detects an added symbol and maps it to its output doc', () => {
    write('math.ts', '/** Add. */\nexport function add(a: number, b: number): number {\n  return a + b;\n}\n');
    const before = parse();
    write(
      'math.ts',
      '/** Add. */\nexport function add(a: number, b: number): number {\n  return a + b;\n}\n\n/** Multiply. */\nexport function mul(a: number, b: number): number {\n  return a * b;\n}\n',
    );
    const after = parse();

    const diff = diffProjects(before, after, DEFAULT_CONFIG);
    expect(diff.hasChanges).toBe(true);
    expect(diff.added.map((s) => s.id)).toEqual(['src/math.ts::mul']);
    expect(diff.removed).toHaveLength(0);
    expect(diff.changed).toHaveLength(0);

    expect(diff.docs).toHaveLength(1);
    expect(diff.docs[0]).toMatchObject({
      output: 'docs/math.md',
      source: 'src/math.ts',
      status: 'modified',
      added: 1,
      changed: 0,
      removed: 0,
    });
  });

  it('detects a removed symbol', () => {
    write(
      'math.ts',
      '/** Add. */\nexport function add(a: number, b: number): number {\n  return a + b;\n}\n\n/** Subtract. */\nexport function sub(a: number, b: number): number {\n  return a - b;\n}\n',
    );
    const before = parse();
    write('math.ts', '/** Add. */\nexport function add(a: number, b: number): number {\n  return a + b;\n}\n');
    const after = parse();

    const diff = diffProjects(before, after, DEFAULT_CONFIG);
    expect(diff.removed.map((s) => s.id)).toEqual(['src/math.ts::sub']);
    expect(diff.added).toHaveLength(0);
    expect(diff.docs[0].removed).toBe(1);
  });

  it('detects a changed signature and names the changed field', () => {
    write('math.ts', '/** Add. */\nexport function add(a: number, b: number): number {\n  return a + b;\n}\n');
    const before = parse();
    write('math.ts', '/** Add. */\nexport function add(a: number, b: number, c: number): number {\n  return a + b + c;\n}\n');
    const after = parse();

    const diff = diffProjects(before, after, DEFAULT_CONFIG);
    expect(diff.added).toHaveLength(0);
    expect(diff.removed).toHaveLength(0);
    expect(diff.changed).toHaveLength(1);
    expect(diff.changed[0].id).toBe('src/math.ts::add');
    expect(diff.changed[0].fields).toContain('signature');
    expect(diff.changed[0].fields).toContain('params');
  });

  it('ignores a cosmetic edit that only shifts line numbers', () => {
    write('math.ts', '/** Add. */\nexport function add(a: number, b: number): number {\n  return a + b;\n}\n');
    const before = parse();
    // Prepend an unrelated comment — `add` moves down, but nothing about it changed.
    write('math.ts', '// unrelated note\n\n/** Add. */\nexport function add(a: number, b: number): number {\n  return a + b;\n}\n');
    const after = parse();

    const diff = diffProjects(before, after, DEFAULT_CONFIG);
    expect(diff.hasChanges).toBe(false);
  });

  it('detects a change to a nested class method', () => {
    write(
      'box.ts',
      'export class Box {\n  /** Area. */\n  area(): number {\n    return 1;\n  }\n}\n',
    );
    const before = parse();
    write(
      'box.ts',
      'export class Box {\n  /** Area. */\n  area(scale: number): number {\n    return scale;\n  }\n}\n',
    );
    const after = parse();

    const diff = diffProjects(before, after, DEFAULT_CONFIG);
    const changedIds = diff.changed.map((s) => s.id);
    expect(changedIds).toContain('src/box.ts::Box.area');
  });

  it('reports a likely rename instead of an add + remove', () => {
    write('date.ts', '/** Format. */\nexport function formatDate(d: Date): string {\n  return String(d);\n}\n');
    const before = parse();
    write('date.ts', '/** Format. */\nexport function formatDateUTC(d: Date): string {\n  return String(d);\n}\n');
    const after = parse();

    const diff = diffProjects(before, after, DEFAULT_CONFIG);
    expect(diff.renames).toHaveLength(1);
    expect(diff.renames[0].from.id).toBe('src/date.ts::formatDate');
    expect(diff.renames[0].to.id).toBe('src/date.ts::formatDateUTC');
    // The pair is lifted out of the raw add/remove sets.
    expect(diff.added).toHaveLength(0);
    expect(diff.removed).toHaveLength(0);
    expect(diff.hasChanges).toBe(true);
  });

  it('marks a wholly new source file as an added doc', () => {
    write('math.ts', '/** Add. */\nexport function add(a: number): number {\n  return a;\n}\n');
    const before = parse();
    write('extra.ts', '/** Hello. */\nexport function hello(): string {\n  return "hi";\n}\n');
    const after = parse();

    const diff = diffProjects(before, after, DEFAULT_CONFIG);
    const extraDoc = diff.docs.find((d) => d.source === 'src/extra.ts');
    expect(extraDoc?.status).toBe('added');
    expect(extraDoc?.output).toBe('docs/extra.md');
  });
});
