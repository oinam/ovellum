import { afterEach, describe, expect, it, vi } from 'vitest';
import { detectManager, upgradeCommand } from '../update/install.js';
import { compareSemver, isNewer, parseSemver } from '../update/semver.js';

describe('parseSemver', () => {
  it('parses a plain version', () => {
    expect(parseSemver('1.2.3')).toEqual({ major: 1, minor: 2, patch: 3, pre: [] });
  });

  it('tolerates a leading v and strips build metadata', () => {
    expect(parseSemver('v1.2.3+build.5')).toEqual({ major: 1, minor: 2, patch: 3, pre: [] });
  });

  it('captures prerelease identifiers', () => {
    expect(parseSemver('1.2.3-beta.1')).toEqual({
      major: 1,
      minor: 2,
      patch: 3,
      pre: ['beta', '1'],
    });
  });

  it('returns null for non-semver input', () => {
    expect(parseSemver('1.2')).toBeNull();
    expect(parseSemver('latest')).toBeNull();
    expect(parseSemver('1.x.0')).toBeNull();
  });
});

describe('compareSemver', () => {
  it('orders by major, minor, patch', () => {
    expect(compareSemver('1.0.0', '2.0.0')).toBeLessThan(0);
    expect(compareSemver('1.2.0', '1.1.0')).toBeGreaterThan(0);
    expect(compareSemver('1.1.1', '1.1.2')).toBeLessThan(0);
    expect(compareSemver('1.1.1', '1.1.1')).toBe(0);
  });

  it('ranks a release above its prerelease', () => {
    expect(compareSemver('1.0.0-rc.1', '1.0.0')).toBeLessThan(0);
    expect(compareSemver('1.0.0', '1.0.0-rc.1')).toBeGreaterThan(0);
  });

  it('orders prerelease identifiers per spec', () => {
    expect(compareSemver('1.0.0-alpha', '1.0.0-beta')).toBeLessThan(0);
    expect(compareSemver('1.0.0-alpha.1', '1.0.0-alpha.2')).toBeLessThan(0);
    // numeric identifiers rank below alphanumeric
    expect(compareSemver('1.0.0-1', '1.0.0-alpha')).toBeLessThan(0);
  });

  it('treats unparseable input as no-signal (0)', () => {
    expect(compareSemver('1.0.0', 'garbage')).toBe(0);
  });
});

describe('isNewer', () => {
  it('is true only when latest strictly exceeds current', () => {
    expect(isNewer('0.2.3', '0.2.5')).toBe(true);
    expect(isNewer('0.2.5', '0.2.5')).toBe(false);
    expect(isNewer('0.2.5', '0.2.3')).toBe(false);
  });
});

describe('detectManager', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('reads the manager from npm_config_user_agent', () => {
    expect(detectManager('pnpm/8.0.0 npm/? node/v20')).toBe('pnpm');
    expect(detectManager('yarn/4.1.0 npm/? node/v20')).toBe('yarn');
    expect(detectManager('bun/1.1.0')).toBe('bun');
    expect(detectManager('npm/10.0.0 node/v20')).toBe('npm');
  });

  it('falls back to npm for an empty or unknown agent', () => {
    expect(detectManager('')).toBe('npm');
    expect(detectManager('deno/1.0')).toBe('npm');
  });

  it('reads the live env when called with no argument', () => {
    // The no-arg default reads process.env.npm_config_user_agent; stub it so
    // the result is deterministic regardless of which manager runs the tests.
    vi.stubEnv('npm_config_user_agent', '');
    expect(detectManager()).toBe('npm');
    vi.stubEnv('npm_config_user_agent', 'pnpm/9.0.0 node/v20');
    expect(detectManager()).toBe('pnpm');
  });
});

describe('upgradeCommand', () => {
  it('builds global commands per manager', () => {
    expect(upgradeCommand('npm', false)).toBe('npm install -g ovellum@latest');
    expect(upgradeCommand('pnpm', false)).toBe('pnpm add -g ovellum@latest');
    expect(upgradeCommand('yarn', false)).toBe('yarn global add ovellum@latest');
    expect(upgradeCommand('bun', false)).toBe('bun add -g ovellum@latest');
  });

  it('builds local devDependency commands per manager', () => {
    expect(upgradeCommand('npm', true)).toBe('npm install -D ovellum@latest');
    expect(upgradeCommand('pnpm', true)).toBe('pnpm add -D ovellum@latest');
    expect(upgradeCommand('yarn', true)).toBe('yarn add -D ovellum@latest');
    expect(upgradeCommand('bun', true)).toBe('bun add -d ovellum@latest');
  });
});
