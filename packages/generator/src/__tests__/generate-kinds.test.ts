import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, type DocNode, type DocProject } from '@ovellum/core';
import { generateDocs } from '../generate.js';

/**
 * The original generate.test covers a plain function. This exercises the
 * other rendering branches in templates.ts: the deprecated/since banners and
 * class children grouped into Properties / Methods sections — the parts most
 * likely to silently malform when the IR shape shifts.
 */

function projectWith(nodes: DocNode[]): DocProject {
  return {
    name: 'demo',
    version: '0.1.0',
    generatedAt: '2026-05-13T00:00:00.000Z',
    files: [{ filePath: 'src/thing.ts', nodes }],
  };
}

function render(nodes: DocNode[]): string {
  const result = generateDocs(projectWith(nodes), DEFAULT_CONFIG);
  const body = result.files.get('docs/thing.md');
  expect(body, 'expected docs/thing.md to be generated').toBeDefined();
  return body!;
}

const base = {
  filePath: 'src/thing.ts',
  line: 1,
  isExported: true,
  isInternal: false,
  isPreserved: false,
  tags: {},
} as const;

describe('generateDocs — node kinds and banners', () => {
  it('renders the deprecated banner and since note for a function', () => {
    const body = render([
      {
        ...base,
        id: 'src/thing.ts::oldFn',
        kind: 'function',
        name: 'oldFn',
        signature: 'function oldFn(): void',
        description: 'Legacy entry point.',
        deprecated: 'Use newFn instead.',
        since: '0.1.0',
      },
    ]);
    expect(body).toContain('## `oldFn`');
    expect(body).toContain('> **Deprecated.** Use newFn instead.');
    expect(body).toContain('*Since: 0.1.0*');
  });

  it('groups class children into Properties and Methods sections', () => {
    const body = render([
      {
        ...base,
        id: 'src/thing.ts::Box',
        kind: 'class',
        name: 'Box',
        signature: 'class Box',
        description: 'A 2D box.',
        children: [
          {
            ...base,
            id: 'src/thing.ts::Box.width',
            kind: 'property',
            name: 'width',
            signature: 'width: number',
            description: 'Width in px.',
          },
          {
            ...base,
            id: 'src/thing.ts::Box.area',
            kind: 'method',
            name: 'area',
            signature: 'area(): number',
            description: 'Computes the area.',
            returns: { type: 'number', description: 'The area.' },
          },
        ],
      },
    ]);
    expect(body).toContain('## `Box`');
    expect(body).toContain('#### Properties');
    expect(body).toContain('width');
    expect(body).toContain('#### Methods');
    expect(body).toContain('##### `area`');
    // Property and method anchors are emitted for downstream merge targeting.
    expect(body).toContain('<!-- ovellum:anchor id="src/thing.ts::Box.area"');
  });

  it('renders an enum with its members', () => {
    const body = render([
      {
        ...base,
        id: 'src/thing.ts::State',
        kind: 'enum',
        name: 'State',
        signature: "enum State",
        children: [
          { ...base, id: 'src/thing.ts::State.On', kind: 'property', name: 'On', signature: "On = 'on'" },
          { ...base, id: 'src/thing.ts::State.Off', kind: 'property', name: 'Off', signature: "Off = 'off'" },
        ],
      },
    ]);
    expect(body).toContain('## `State`');
    expect(body).toContain('On');
    expect(body).toContain('Off');
  });
});
