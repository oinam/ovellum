import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../types/config.js';
import { mergeConfig } from '../config/merge.js';

describe('mergeConfig', () => {
  it('returns a clone of base when override is empty', () => {
    const result = mergeConfig(DEFAULT_CONFIG, {});
    expect(result).toEqual(DEFAULT_CONFIG);
    expect(result).not.toBe(DEFAULT_CONFIG);
  });

  it('child wins on conflict', () => {
    const result = mergeConfig(DEFAULT_CONFIG, { mode: 'manual', output: './site' });
    expect(result.mode).toBe('manual');
    expect(result.output).toBe('./site');
    expect(result.input).toBe(DEFAULT_CONFIG.input);
  });

  it('replaces arrays wholesale (no concat)', () => {
    const result = mergeConfig(DEFAULT_CONFIG, { include: ['**/*.ts'] });
    expect(result.include).toEqual(['**/*.ts']);
  });

  it('shallow-merges the protect object field-by-field', () => {
    const result = mergeConfig(DEFAULT_CONFIG, {
      protect: { orphanRetention: 7 },
    });
    expect(result.protect.orphanRetention).toBe(7);
    expect(result.protect.blockTag).toBe(DEFAULT_CONFIG.protect.blockTag);
    expect(result.protect.orphanDir).toBe(DEFAULT_CONFIG.protect.orphanDir);
  });

  it('ignores undefined override values', () => {
    const result = mergeConfig(DEFAULT_CONFIG, { mode: undefined, name: 'pkg' });
    expect(result.mode).toBe(DEFAULT_CONFIG.mode);
    expect(result.name).toBe('pkg');
  });
});
