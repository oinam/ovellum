import { describe, expect, it } from 'vitest';
import { countWords, readingMinutes } from '../page-meta.js';

describe('countWords', () => {
  it('counts plain prose', () => {
    expect(countWords('one two three four')).toBe(4);
  });

  it('ignores fenced code blocks', () => {
    const md = 'before\n\n```ts\nconst x = 1; const y = 2;\n```\n\nafter';
    expect(countWords(md)).toBe(2);
  });

  it('ignores inline code', () => {
    expect(countWords('use `foo` and `bar` for things')).toBe(4);
  });

  it('keeps link text but drops the URL', () => {
    expect(countWords('see [the docs](https://x.test/very/long) for more')).toBe(5);
  });

  it('keeps image alt text', () => {
    expect(countWords('![A diagram of the system](/img/arch.svg)')).toBe(5);
  });

  it('strips heading punctuation', () => {
    expect(countWords('# Hello world\n\n## Two\n\nbody')).toBe(4);
  });
});

describe('readingMinutes', () => {
  it('returns 0 for empty content', () => {
    expect(readingMinutes(0)).toBe(0);
  });

  it('rounds up and floors at 1 minute', () => {
    expect(readingMinutes(1)).toBe(1);
    expect(readingMinutes(199)).toBe(1);
    expect(readingMinutes(200)).toBe(1);
    expect(readingMinutes(201)).toBe(2);
    expect(readingMinutes(450)).toBe(3);
  });
});
