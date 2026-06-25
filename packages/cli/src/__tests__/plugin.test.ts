import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The Claude Code plugin + marketplace artifacts (M2). Validate they're
 * well-formed JSON and wired correctly — a malformed manifest or a moved skill
 * would silently break one-step adoption.
 */

// vitest runs with cwd = packages/cli; the repo root is two levels up.
const repoRoot = path.resolve(process.cwd(), '..', '..');
const read = (rel: string) => readFileSync(path.join(repoRoot, rel), 'utf8');
const readJson = (rel: string) => JSON.parse(read(rel)) as Record<string, unknown>;

describe('Claude Code plugin (M2)', () => {
  it('marketplace.json lists the ovellum plugin', () => {
    const m = readJson('.claude-plugin/marketplace.json');
    expect(m.name).toBe('ovellum');
    const plugins = m.plugins as Array<{ name: string; source: string }>;
    const ovellum = plugins.find((p) => p.name === 'ovellum');
    expect(ovellum?.source).toBe('./plugins/ovellum');
  });

  it('plugin.json is a valid manifest', () => {
    const p = readJson('plugins/ovellum/.claude-plugin/plugin.json');
    expect(p.name).toBe('ovellum');
    expect(typeof p.version).toBe('string');
    expect(typeof p.description).toBe('string');
  });

  it('.mcp.json registers the ovellum MCP server', () => {
    const mcp = readJson('plugins/ovellum/.mcp.json');
    const servers = mcp.mcpServers as Record<string, { command: string; args: string[] }>;
    expect(servers.ovellum?.command).toBe('npx');
    expect(servers.ovellum?.args).toContain('mcp');
  });

  it('bundles the ovellum-docs skill', () => {
    const skillPath = 'plugins/ovellum/skills/ovellum-docs/SKILL.md';
    expect(existsSync(path.join(repoRoot, skillPath))).toBe(true);
    const skill = read(skillPath);
    expect(skill).toContain('name: ovellum-docs');
    // The old top-level location must be gone (single source of truth).
    expect(existsSync(path.join(repoRoot, 'skills/ovellum-docs/SKILL.md'))).toBe(false);
  });
});
