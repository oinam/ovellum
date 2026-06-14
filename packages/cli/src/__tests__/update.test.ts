import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  declaresLocalDependency,
  detectInstall,
  detectManager,
  detectManagerFromLockfile,
  isLocalInstall,
  upgradeCommand,
} from '../update/install.js';
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

describe('local-dependency detection', () => {
  let dir: string;
  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
  });
  const seed = (files: Record<string, string>): string => {
    dir = mkdtempSync(path.join(tmpdir(), 'ovellum-install-'));
    for (const [name, body] of Object.entries(files)) {
      writeFileSync(path.join(dir, name), body);
    }
    return dir;
  };

  it('treats a project that declares ovellum as a local install', () => {
    const cwd = seed({
      'package.json': JSON.stringify({ devDependencies: { ovellum: '^0.10.0' } }),
    });
    expect(declaresLocalDependency(cwd)).toBe(true);
    expect(isLocalInstall(cwd)).toBe(true);
  });

  it('detects ovellum in any dependency field', () => {
    expect(declaresLocalDependency(seed({ 'package.json': '{"dependencies":{"ovellum":"*"}}' }))).toBe(
      true,
    );
    expect(
      declaresLocalDependency(seed({ 'package.json': '{"optionalDependencies":{"ovellum":"*"}}' })),
    ).toBe(true);
  });

  it('is not local when package.json is absent, unparseable, or omits ovellum', () => {
    expect(declaresLocalDependency(seed({}))).toBe(false);
    expect(declaresLocalDependency(seed({ 'package.json': 'not json' }))).toBe(false);
    expect(
      declaresLocalDependency(seed({ 'package.json': '{"devDependencies":{"other":"1.0.0"}}' })),
    ).toBe(false);
  });
});

describe('detectManagerFromLockfile', () => {
  let dir: string;
  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
  });
  const seedLock = (name: string): string => {
    dir = mkdtempSync(path.join(tmpdir(), 'ovellum-lock-'));
    writeFileSync(path.join(dir, name), '');
    return dir;
  };

  it('maps each lockfile to its manager', () => {
    expect(detectManagerFromLockfile(seedLock('pnpm-lock.yaml'))).toBe('pnpm');
    expect(detectManagerFromLockfile(seedLock('yarn.lock'))).toBe('yarn');
    expect(detectManagerFromLockfile(seedLock('bun.lockb'))).toBe('bun');
    expect(detectManagerFromLockfile(seedLock('package-lock.json'))).toBe('npm');
  });

  it('returns null with no lockfile', () => {
    dir = mkdtempSync(path.join(tmpdir(), 'ovellum-lock-'));
    expect(detectManagerFromLockfile(dir)).toBeNull();
  });
});

describe('detectInstall', () => {
  let dir: string;
  afterEach(() => {
    vi.unstubAllEnvs();
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  it('prefers the local dependency + the project lockfile manager over the ambient agent', () => {
    // Simulates the real footgun: a global binary (ambient agent says npm, or
    // nothing) invoked inside a pnpm project that declares ovellum locally.
    vi.stubEnv('npm_config_user_agent', '');
    dir = mkdtempSync(path.join(tmpdir(), 'ovellum-detect-'));
    writeFileSync(path.join(dir, 'package.json'), '{"devDependencies":{"ovellum":"^0.10.0"}}');
    writeFileSync(path.join(dir, 'pnpm-lock.yaml'), '');
    const info = detectInstall(dir);
    expect(info.local).toBe(true);
    expect(info.manager).toBe('pnpm');
    expect(info.command).toBe('pnpm add -D ovellum@latest');
  });

  it('falls back to a global install when the project has no ovellum', () => {
    vi.stubEnv('npm_config_user_agent', 'npm/10.0.0 node/v20');
    dir = mkdtempSync(path.join(tmpdir(), 'ovellum-detect-'));
    writeFileSync(path.join(dir, 'package.json'), '{"devDependencies":{"other":"1.0.0"}}');
    const info = detectInstall(dir);
    expect(info.local).toBe(false);
    expect(info.command).toBe('npm install -g ovellum@latest');
  });
});
