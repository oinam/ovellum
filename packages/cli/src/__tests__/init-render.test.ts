import { describe, expect, it } from 'vitest';
import { renderStarterIndex } from '../commands/init.js';

/**
 * The scaffolded starter page (U3): hybrid mode leads with a `@manual`
 * protected-zone example so new users meet the survives-every-rebuild contract
 * on day one; manual mode stays a plain page.
 */
const base = {
  name: 'my-docs',
  title: 'My Docs',
  description: '',
  input: 'content',
  output: 'dist',
  tsconfig: 'tsconfig.json',
  defaultTheme: 'auto' as const,
  landing: false,
};

describe('renderStarterIndex', () => {
  it('hybrid: includes a @manual protected-zone example', () => {
    const md = renderStarterIndex({ ...base, mode: 'hybrid' });
    expect(md).toContain('<!-- @manual:start id="welcome-note" -->');
    expect(md).toContain('<!-- @manual:end -->');
    expect(md).toContain('survives every rebuild');
  });

  it('manual: no protected-zone block', () => {
    const md = renderStarterIndex({ ...base, mode: 'manual' });
    expect(md).not.toContain('@manual:start');
  });
});
