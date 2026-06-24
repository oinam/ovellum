import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '@ovellum/core';
import { runBuild } from '../dev/run-build.js';
import { createMcpServer, type McpServer } from '../dev/mcp/server.js';

/**
 * The dependency-free MCP stdio server (ROADMAP C2). Drives `handleMessage`
 * directly — the JSON-RPC handshake plus the IR-backed tools — against a real
 * built temp project.
 */

function callText(server: McpServer, name: string, args: Record<string, unknown> = {}) {
  return server.handleMessage({ jsonrpc: '2.0', id: 9, method: 'tools/call', params: { name, arguments: args } });
}

describe('MCP server', () => {
  let dir: string;
  let server: McpServer;

  beforeEach(async () => {
    dir = mkdtempSync(path.join(tmpdir(), 'ovellum-mcp-'));
    mkdirSync(path.join(dir, 'src'), { recursive: true });
    writeFileSync(
      path.join(dir, 'ovellum.config.json'),
      JSON.stringify({ mode: 'hybrid', input: './src', output: './docs' }),
    );
    writeFileSync(
      path.join(dir, 'src', 'math.ts'),
      '/** Add two numbers. */\nexport function add(a: number, b: number): number {\n  return a + b;\n}\n',
      'utf8',
    );
    await runBuild({ config: { ...DEFAULT_CONFIG, input: './src', output: './docs', mode: 'hybrid' }, cwd: dir });
    server = createMcpServer({ cwd: dir, version: '9.9.9' });
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('handshakes: echoes the protocol version and advertises tools', async () => {
    const init = await server.handleMessage({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: { protocolVersion: '2025-06-18' },
    });
    expect(init?.result).toMatchObject({
      protocolVersion: '2025-06-18',
      capabilities: { tools: {} },
      serverInfo: { name: 'ovellum', version: '9.9.9' },
    });

    // The initialized notification gets no response.
    const note = await server.handleMessage({ jsonrpc: '2.0', method: 'notifications/initialized' });
    expect(note).toBeNull();
  });

  it('lists the tool surface', async () => {
    const res = await server.handleMessage({ jsonrpc: '2.0', id: 2, method: 'tools/list' });
    const names = (res?.result as { tools: Array<{ name: string }> }).tools.map((t) => t.name);
    expect(names).toContain('ovellum_query_symbol');
    expect(names).toContain('ovellum_diff');
    expect(names).toContain('ovellum_check');
    expect(names).toContain('ovellum_list_orphans');
    expect(names).toContain('ovellum_get_page');
    expect(names).toContain('ovellum_build');
    expect(names).toContain('ovellum_write_zone');
  });

  it('runs ovellum_check and returns structured findings', async () => {
    const res = await callText(server, 'ovellum_check', {});
    const payload = JSON.parse((res?.result as { content: Array<{ text: string }> }).content[0].text);
    expect(payload).toHaveProperty('ok');
    expect(payload).toHaveProperty('counts.brokenLinks');
    expect(Array.isArray(payload.issues)).toBe(true);
  });

  it('queries a symbol from the IR snapshot', async () => {
    const res = await callText(server, 'ovellum_query_symbol', { id: 'src/math.ts::add' });
    const payload = JSON.parse((res?.result as { content: Array<{ text: string }> }).content[0].text);
    expect(payload.count).toBe(1);
    expect(payload.symbols[0].id).toBe('src/math.ts::add');
    expect(payload.symbols[0].signature).toContain('add');
  });

  it('writes a protected zone that lands in the doc', async () => {
    const res = await callText(server, 'ovellum_write_zone', {
      anchorId: 'src/math.ts::add',
      content: 'Agent rationale.',
      blockId: 'why',
    });
    const out = res?.result as { content: Array<{ text: string }>; isError: boolean };
    expect(out.isError).toBe(false);
    const payload = JSON.parse(out.content[0].text);
    expect(payload.action).toBe('inserted');

    const doc = readFileSync(path.join(dir, 'docs', 'math.md'), 'utf8');
    expect(doc).toContain('<!-- @manual:start id="why" -->');
    expect(doc).toContain('Agent rationale.');
  });

  it('dryRun previews a zone write without touching the file', async () => {
    const before = readFileSync(path.join(dir, 'docs', 'math.md'), 'utf8');
    const res = await callText(server, 'ovellum_write_zone', {
      anchorId: 'src/math.ts::add',
      content: 'preview only',
      dryRun: true,
    });
    const payload = JSON.parse((res?.result as { content: Array<{ text: string }> }).content[0].text);
    expect(payload.dryRun).toBe(true);
    expect(payload.block).toContain('preview only');
    expect(readFileSync(path.join(dir, 'docs', 'math.md'), 'utf8')).toBe(before);
  });

  it('returns a tool error for a missing symbol, and JSON-RPC errors for bad calls', async () => {
    const missing = await callText(server, 'ovellum_query_symbol', { id: 'src/math.ts::nope' });
    const payload = JSON.parse((missing?.result as { content: Array<{ text: string }>; isError: boolean }).content[0].text);
    expect((missing?.result as { isError: boolean }).isError).toBe(false); // no match is not an error
    expect(payload.count).toBe(0);

    const unknownTool = await callText(server, 'ovellum_nope', {});
    expect(unknownTool?.error?.code).toBe(-32602);

    const unknownMethod = await server.handleMessage({ jsonrpc: '2.0', id: 5, method: 'does/not/exist' });
    expect(unknownMethod?.error?.code).toBe(-32601);
  });
});
