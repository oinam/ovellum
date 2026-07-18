import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, type DocProject } from '@ovellum/core';
import { generateDocs } from '../generate.js';
import { outputPathFor } from '../path.js';

const baseProject: DocProject = {
  name: 'demo',
  version: '0.1.0',
  generatedAt: '2026-05-13T00:00:00.000Z',
  files: [
    {
      filePath: 'src/format.ts',
      nodes: [
        {
          id: 'src/format.ts::padZero',
          kind: 'function',
          name: 'padZero',
          filePath: 'src/format.ts',
          line: 1,
          signature: 'function padZero(value: number, width: number): string',
          description: 'Pads a number with leading zeros up to `width`.',
          isExported: true,
          isInternal: false,
          isPreserved: false,
          tags: {},
          params: [
            { name: 'value', type: 'number', optional: false, description: 'The number to pad.' },
            { name: 'width', type: 'number', optional: false, description: 'Target width.' },
          ],
          returns: { type: 'string', description: 'The padded string.' },
          examples: ["padZero(7, 3) // '007'"],
        },
      ],
    },
  ],
};

describe('outputPathFor', () => {
  it('maps src/foo/bar.ts → docs/foo/bar.md', () => {
    expect(outputPathFor('src/foo/bar.ts', DEFAULT_CONFIG)).toBe('docs/foo/bar.md');
  });

  it('honors mdx format', () => {
    expect(outputPathFor('src/index.ts', { ...DEFAULT_CONFIG, defaultFormat: 'mdx' })).toBe(
      'docs/index.mdx',
    );
  });
});

describe('generateDocs', () => {
  it('produces a frontmatter + a function section', () => {
    const result = generateDocs(baseProject, DEFAULT_CONFIG);
    expect(result.files.size).toBe(1);
    const body = result.files.get('docs/format.md');
    expect(body).toBeDefined();
    expect(body).toContain('---\ntitle:');
    expect(body).toContain('source: src/format.ts');
    expect(body).toContain('ovellum: true');
    expect(body).toContain('## `padZero`');
    expect(body).toContain('<!-- ovellum:anchor id="src/format.ts::padZero"');
    expect(body).toContain('```typescript\nfunction padZero');
    expect(body).toContain('**Parameters**');
    expect(body).toContain('| `value` | `number` | The number to pad. |');
    expect(body).toContain('**Returns** `string` - The padded string.');
    expect(body).toContain('**Example**');
    expect(body).toContain("padZero(7, 3) // '007'");
  });

  it('is deterministic — no build timestamp churns the output', () => {
    // Two independent runs must be byte-identical. A volatile `generated: <now>`
    // frontmatter field or anchor `generated="<now>"` attribute would break this
    // and make every regeneration a fresh git diff → "Edited today" forever.
    const a = generateDocs(baseProject, DEFAULT_CONFIG).files.get('docs/format.md');
    const b = generateDocs(baseProject, DEFAULT_CONFIG).files.get('docs/format.md');
    expect(a).toBe(b);
    expect(a).not.toContain('generated:');
    expect(a).not.toContain('generated=');
  });

  it('stamps `updated:` from the resolved source date, and omits it when absent', () => {
    const withDate = generateDocs(baseProject, DEFAULT_CONFIG, {
      sourceDates: new Map([['src/format.ts', '2026-05-30T10:00:00+05:30']]),
    }).files.get('docs/format.md');
    expect(withDate).toContain('updated: ');
    expect(withDate).toContain('2026-05-30T10:00:00+05:30');

    const withoutDate = generateDocs(baseProject, DEFAULT_CONFIG).files.get('docs/format.md');
    expect(withoutDate).not.toContain('updated:');

    // An unrelated source path in the map must not leak onto this file.
    const mismatched = generateDocs(baseProject, DEFAULT_CONFIG, {
      sourceDates: new Map([['src/other.ts', '2026-05-30T10:00:00+05:30']]),
    }).files.get('docs/format.md');
    expect(mismatched).not.toContain('updated:');
  });

  it('emits one output file per source file', () => {
    const proj: DocProject = {
      ...baseProject,
      files: [baseProject.files[0]!, { filePath: 'src/sub/util.ts', nodes: [] }],
    };
    proj.files[1]!.nodes.push({
      id: 'src/sub/util.ts::stub',
      kind: 'function',
      name: 'stub',
      filePath: 'src/sub/util.ts',
      line: 1,
      signature: 'function stub(): void',
      isExported: true,
      isInternal: false,
      isPreserved: false,
      tags: {},
    });
    const result = generateDocs(proj, DEFAULT_CONFIG);
    expect(Array.from(result.files.keys()).sort()).toEqual(['docs/format.md', 'docs/sub/util.md']);
  });
});
