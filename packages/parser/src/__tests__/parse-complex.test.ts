import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, type OvellumConfig } from '@ovellum/core';
import { parseProject } from '../parse.js';

/**
 * Coverage for the gnarly extraction branches the original parse.test only
 * skims: generics, optional/default/rest/union params, interfaces with
 * heritage, type aliases, and the includePrivate gate. These are exactly the
 * shapes real TS libraries are full of — and where signature rendering most
 * often goes wrong downstream.
 */

describe('parseProject — complex declarations', () => {
  let cwd: string;

  beforeEach(() => {
    cwd = mkdtempSync(path.join(tmpdir(), 'ovellum-parser-cx-'));
    mkdirSync(path.join(cwd, 'src'));
  });
  afterEach(() => rmSync(cwd, { recursive: true, force: true }));

  function write(file: string, src: string): void {
    writeFileSync(path.join(cwd, 'src', file), src.trim());
  }
  function parse(config: OvellumConfig = DEFAULT_CONFIG) {
    return parseProject({ config, cwd });
  }

  it('keeps type parameters in a generic function signature', () => {
    write('id.ts', `export function identity<T>(value: T): T { return value; }`);
    const fn = parse().files[0]!.nodes.find((n) => n.name === 'identity')!;
    expect(fn.signature).toContain('<T>');
    expect(fn.signature).toContain('identity<T>(value: T): T');
    expect(fn.params).toEqual([
      { name: 'value', type: 'T', optional: false, description: undefined },
    ]);
  });

  it('marks optional, default, and rest params as optional', () => {
    write(
      'opts.ts',
      `export function f(a: number, b?: string, c: boolean = true, ...rest: number[]): void {}`,
    );
    const fn = parse().files[0]!.nodes.find((n) => n.name === 'f')!;
    const byName = Object.fromEntries(fn.params!.map((p) => [p.name, p]));
    expect(byName.a!.optional).toBe(false);
    expect(byName.b!.optional).toBe(true); // question token
    expect(byName.c!.optional).toBe(true); // has a default
    expect(byName.rest!.optional).toBe(true); // rest parameter
    expect(byName.rest!.type).toContain('number[]');
  });

  it('preserves union and intersection param types verbatim', () => {
    write(
      'types.ts',
      `export function classify(x: string | number, opts: { a: 1 } & { b: 2 }): 'a' | 'b' { return 'a'; }`,
    );
    const fn = parse().files[0]!.nodes.find((n) => n.name === 'classify')!;
    expect(fn.params![0]!.type).toBe('string | number');
    expect(fn.params![1]!.type).toBe('{ a: 1 } & { b: 2 }');
    expect(fn.returns!.type).toBe(`'a' | 'b'`);
  });

  it('extracts an interface with heritage, properties, and methods', () => {
    write(
      'shape.ts',
      `
export interface Base { id: string; }
export interface Shape extends Base {
  /** Optional label. */
  label?: string;
  area(): number;
}
      `,
    );
    const iface = parse().files[0]!.nodes.find((n) => n.name === 'Shape')!;
    expect(iface.kind).toBe('interface');
    expect(iface.signature).toContain('extends Base');
    const props = iface.children!.filter((c) => c.kind === 'property').map((c) => c.name);
    const methods = iface.children!.filter((c) => c.kind === 'method').map((c) => c.name);
    expect(props).toContain('label');
    expect(methods).toContain('area');
    const label = iface.children!.find((c) => c.name === 'label')!;
    expect(label.signature).toContain('label?:');
  });

  it('extracts a generic union type alias', () => {
    write('result.ts', `export type Result<T> = { ok: true; value: T } | { ok: false; error: string };`);
    const alias = parse().files[0]!.nodes.find((n) => n.name === 'Result')!;
    expect(alias.kind).toBe('type');
    expect(alias.signature).toContain('type Result<T> =');
    expect(alias.signature).toContain('{ ok: false; error: string }');
  });

  it('hides private class members unless includePrivate is set', () => {
    write(
      'svc.ts',
      `
export class Service {
  public name = 'svc';
  private secret = 42;
  private helper(): void {}
}
      `,
    );

    const hidden = parse().files[0]!.nodes.find((n) => n.name === 'Service')!;
    const visibleNames = hidden.children!.map((c) => c.name);
    expect(visibleNames).toContain('name');
    expect(visibleNames).not.toContain('secret');
    expect(visibleNames).not.toContain('helper');

    const withPrivate = parse({ ...DEFAULT_CONFIG, includePrivate: true }).files[0]!.nodes.find(
      (n) => n.name === 'Service',
    )!;
    const allNames = withPrivate.children!.map((c) => c.name);
    expect(allNames).toContain('secret');
    expect(allNames).toContain('helper');
  });
});
