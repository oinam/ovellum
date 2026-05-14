import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '@ovellum/core';
import { parseProject } from '../parse.js';

describe('parseProject', () => {
  let cwd: string;

  beforeEach(() => {
    cwd = mkdtempSync(path.join(tmpdir(), 'ovellum-parser-'));
    mkdirSync(path.join(cwd, 'src'));
  });

  afterEach(() => {
    rmSync(cwd, { recursive: true, force: true });
  });

  it('extracts an exported function with JSDoc params and returns', () => {
    writeFileSync(
      path.join(cwd, 'src', 'add.ts'),
      `
/**
 * Add two numbers.
 *
 * @param a - First addend.
 * @param b - Second addend.
 * @returns The sum.
 */
export function add(a: number, b: number): number {
  return a + b;
}
      `.trim(),
    );

    const project = parseProject({ config: DEFAULT_CONFIG, cwd });
    expect(project.files).toHaveLength(1);
    const file = project.files[0]!;
    expect(file.filePath).toBe('src/add.ts');
    const fn = file.nodes.find((n) => n.name === 'add');
    expect(fn).toBeDefined();
    expect(fn?.kind).toBe('function');
    expect(fn?.isExported).toBe(true);
    expect(fn?.description).toBe('Add two numbers.');
    expect(fn?.signature).toContain('function add(a: number, b: number): number');
    expect(fn?.params).toEqual([
      { name: 'a', type: 'number', optional: false, description: 'First addend.' },
      { name: 'b', type: 'number', optional: false, description: 'Second addend.' },
    ]);
    expect(fn?.returns).toEqual({ type: 'number', description: 'The sum.' });
    expect(fn?.id).toBe('src/add.ts::add');
  });

  it('skips non-exported functions when includeInternal is false', () => {
    writeFileSync(
      path.join(cwd, 'src', 'helpers.ts'),
      `
function hidden() {}
export function shown() {}
      `.trim(),
    );
    const project = parseProject({ config: DEFAULT_CONFIG, cwd });
    const file = project.files[0]!;
    expect(file.nodes.map((n) => n.name)).toEqual(['shown']);
  });

  it('extracts a class with methods and properties', () => {
    writeFileSync(
      path.join(cwd, 'src', 'box.ts'),
      `
/** A 2D box. */
export class Box {
  /** Width in pixels. */
  width: number = 0;
  /** Height in pixels. */
  height: number = 0;

  /** Returns the box area. */
  area(): number {
    return this.width * this.height;
  }
}
      `.trim(),
    );

    const project = parseProject({ config: DEFAULT_CONFIG, cwd });
    const cls = project.files[0]!.nodes.find((n) => n.kind === 'class');
    expect(cls?.name).toBe('Box');
    expect(cls?.children).toBeDefined();
    const methodNames = cls!.children!.filter((c) => c.kind === 'method').map((c) => c.name);
    const propertyNames = cls!.children!.filter((c) => c.kind === 'property').map((c) => c.name);
    expect(methodNames).toEqual(['area']);
    expect(propertyNames).toEqual(['width', 'height']);
  });

  it('extracts an enum with members', () => {
    writeFileSync(
      path.join(cwd, 'src', 'state.ts'),
      `
export enum State { On = 'on', Off = 'off' }
      `.trim(),
    );
    const project = parseProject({ config: DEFAULT_CONFIG, cwd });
    const en = project.files[0]!.nodes.find((n) => n.kind === 'enum');
    expect(en?.name).toBe('State');
    expect(en?.children?.map((c) => c.name)).toEqual(['On', 'Off']);
  });

  it('respects @deprecated and @since tags', () => {
    writeFileSync(
      path.join(cwd, 'src', 'old.ts'),
      `
/**
 * Old function.
 * @deprecated Use newOne instead.
 * @since 0.1.0
 */
export function oldOne(): void {}
      `.trim(),
    );
    const project = parseProject({ config: DEFAULT_CONFIG, cwd });
    const fn = project.files[0]!.nodes[0]!;
    expect(fn.deprecated).toBe('Use newOne instead.');
    expect(fn.since).toBe('0.1.0');
  });

  it('flags @preserve symbols on the IR node', () => {
    writeFileSync(
      path.join(cwd, 'src', 'preserved.ts'),
      `
/**
 * Keep my prose.
 * @preserve
 */
export function keep(): void {}
      `.trim(),
    );
    const project = parseProject({ config: DEFAULT_CONFIG, cwd });
    const fn = project.files[0]!.nodes[0]!;
    expect(fn.isPreserved).toBe(true);
  });
});
