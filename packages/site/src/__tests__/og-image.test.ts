import { beforeAll, describe, expect, it } from 'vitest';
import { generateOgCard, ogSlug, resolveOgConfig } from '../og-image.js';

/* eslint-disable @typescript-eslint/no-explicit-any */
let sharp: any = null;
beforeAll(async () => {
  try {
    sharp = await import('sharp' as string);
  } catch {
    sharp = null;
  }
});

describe('resolveOgConfig', () => {
  it('maps boolean/object/undefined to colors or null', () => {
    expect(resolveOgConfig(undefined)).toBeNull();
    expect(resolveOgConfig(false)).toBeNull();
    expect(resolveOgConfig(true)).toEqual({ background: '#0c0c0c', foreground: '#f4f4f4' });
    expect(resolveOgConfig({ background: '#fff' })).toEqual({
      background: '#fff',
      foreground: '#f4f4f4',
    });
  });
});

describe('ogSlug', () => {
  it('produces filesystem-safe slugs', () => {
    expect(ogSlug('/')).toBe('index');
    expect(ogSlug('/guide/intro/')).toBe('guide-intro');
    expect(ogSlug('/ja/docs/reference/cli/')).toBe('ja-docs-reference-cli');
  });
});

describe('generateOgCard', () => {
  it('renders a 1200x630 PNG', async () => {
    if (!sharp) return; // sharp not installed — skip
    const png = await generateOgCard({
      title: 'A reasonably long documentation page title that wraps',
      siteTitle: 'Ovellum',
      config: { background: '#0c0c0c', foreground: '#f4f4f4' },
    });
    expect(png.length).toBeGreaterThan(0);
    // PNG magic number.
    expect(png.subarray(0, 4).toString('hex')).toBe('89504e47');
    const meta = await (sharp.default ?? sharp)(png).metadata();
    expect(meta.width).toBe(1200);
    expect(meta.height).toBe(630);
    expect(meta.format).toBe('png');
  });
});
