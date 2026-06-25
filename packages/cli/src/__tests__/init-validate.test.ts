import { describe, expect, it } from 'vitest';
import { validateDir } from '../commands/init.js';

/**
 * `ovellum init` prompt validation (security slice S5). Prompted content/output
 * directories are `path.join(cwd, …)`'d, so they must stay inside the project:
 * reject absolute paths and `..` segments before they reach the filesystem.
 */

describe('validateDir', () => {
  it('accepts simple relative directories', () => {
    expect(validateDir('content')).toBe(true);
    expect(validateDir('docs')).toBe(true);
    expect(validateDir('site/output')).toBe(true);
  });

  it('rejects an empty answer', () => {
    expect(validateDir('   ')).toMatch(/enter a directory/i);
  });

  it('rejects absolute paths', () => {
    expect(validateDir('/etc')).toMatch(/relative/i);
  });

  it('rejects paths that escape the project with ..', () => {
    expect(validateDir('../outside')).toMatch(/inside the project/i);
    expect(validateDir('docs/../../etc')).toMatch(/inside the project/i);
  });
});
