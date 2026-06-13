import { describe, expect, it } from 'vitest';
import {
  isAutoExcludedFileName,
  isExcludedContentFile,
  isExcludedDirName,
  matchesIgnoreFiles,
} from '../content-filter.js';

describe('isExcludedDirName', () => {
  it('skips structural and dependency dirs', () => {
    for (const n of ['_partials', '.git', '.github', 'node_modules']) {
      expect(isExcludedDirName(n)).toBe(true);
    }
  });
  it('keeps real content dirs', () => {
    for (const n of ['guides', 'concepts', 'reference', 'public']) {
      expect(isExcludedDirName(n)).toBe(false);
    }
  });
});

describe('isAutoExcludedFileName', () => {
  it('excludes dotfiles, meta/partials, manifests, and the ovellum config', () => {
    for (const n of [
      '.gitignore',
      '_meta.json',
      'package.json',
      'package-lock.json',
      'pnpm-lock.yaml',
      'yarn.lock',
      'ovellum.config.ts',
      'ovellum.config.json',
      'ovellum.config.mjs',
    ]) {
      expect(isAutoExcludedFileName(n)).toBe(true);
    }
  });
  it('keeps real content files', () => {
    for (const n of ['index.md', 'getting-started.md', 'logo.svg', 'diagram.png']) {
      expect(isAutoExcludedFileName(n)).toBe(false);
    }
  });
});

describe('matchesIgnoreFiles', () => {
  it('matches a no-slash pattern against the basename at any depth', () => {
    expect(matchesIgnoreFiles('README.md', 'README.md', ['README.md'])).toBe(true);
    expect(matchesIgnoreFiles('guides/README.md', 'README.md', ['README.md'])).toBe(true);
    expect(matchesIgnoreFiles('guides/install.md', 'install.md', ['README.md'])).toBe(false);
  });
  it('supports * (non-slash) and matches by basename', () => {
    expect(matchesIgnoreFiles('a/notes.txt', 'notes.txt', ['*.txt'])).toBe(true);
    expect(matchesIgnoreFiles('a/notes.md', 'notes.md', ['*.txt'])).toBe(false);
  });
  it('matches a slashed pattern against the full relative path', () => {
    expect(matchesIgnoreFiles('drafts/secret.md', 'secret.md', ['drafts/**'])).toBe(true);
    expect(matchesIgnoreFiles('drafts/deep/secret.md', 'secret.md', ['drafts/**'])).toBe(true);
    expect(matchesIgnoreFiles('guides/secret.md', 'secret.md', ['drafts/**'])).toBe(false);
    // A single * does not cross directory boundaries.
    expect(matchesIgnoreFiles('drafts/deep/x.md', 'x.md', ['drafts/*'])).toBe(false);
    expect(matchesIgnoreFiles('drafts/x.md', 'x.md', ['drafts/*'])).toBe(true);
  });
  it('returns false for empty pattern lists', () => {
    expect(matchesIgnoreFiles('README.md', 'README.md', [])).toBe(false);
  });
});

describe('isExcludedContentFile', () => {
  it('combines auto-excludes with the ignoreFiles globs', () => {
    expect(isExcludedContentFile('package.json', 'package.json', [])).toBe(true);
    expect(isExcludedContentFile('README.md', 'README.md', ['README.md'])).toBe(true);
    expect(isExcludedContentFile('guides/install.md', 'install.md', ['README.md'])).toBe(false);
  });
});
