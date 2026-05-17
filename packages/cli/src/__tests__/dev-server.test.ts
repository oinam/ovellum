import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { injectReloadScript, startDevServer, type DevServer } from '../dev/server.js';

async function getText(url: string): Promise<{ status: number; body: string; type: string }> {
  const res = await fetch(url);
  return {
    status: res.status,
    body: await res.text(),
    type: res.headers.get('content-type') ?? '',
  };
}

describe('injectReloadScript', () => {
  it('injects before </body> when present', () => {
    const out = injectReloadScript('<html><body>hello</body></html>');
    expect(out).toContain('<script src="/__ovellum/reload.js" defer></script></body>');
  });

  it('matches </body> case-insensitively', () => {
    const out = injectReloadScript('<html><BODY>hi</BODY></html>');
    expect(out).toContain('<script src="/__ovellum/reload.js" defer></script></BODY>');
  });

  it('appends at the end if </body> is missing', () => {
    const out = injectReloadScript('<div>fragment</div>');
    expect(out.endsWith('<script src="/__ovellum/reload.js" defer></script>')).toBe(true);
  });
});

describe('dev server', () => {
  let dir: string;
  let server: DevServer | undefined;

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'ovellum-server-'));
    writeFileSync(path.join(dir, 'index.html'), '<html><body>root</body></html>');
    mkdirSync(path.join(dir, 'foo'));
    writeFileSync(path.join(dir, 'foo', 'index.html'), '<html><body>nested</body></html>');
    writeFileSync(path.join(dir, 'style.css'), 'body{color:red}');
    writeFileSync(path.join(dir, '404.html'), '<html><body>custom not found</body></html>');
  });

  afterEach(async () => {
    if (server) await server.close();
    server = undefined;
    await rm(dir, { recursive: true, force: true });
  });

  it('serves index.html at /', async () => {
    server = await startDevServer({ rootDir: dir, port: 0, host: '127.0.0.1', liveReload: false });
    const r = await getText(server.url);
    expect(r.status).toBe(200);
    expect(r.body).toContain('root');
    expect(r.type).toContain('text/html');
  });

  it('resolves pretty URLs (/foo/ → /foo/index.html)', async () => {
    server = await startDevServer({ rootDir: dir, port: 0, host: '127.0.0.1', liveReload: false });
    const r = await getText(server.url + 'foo/');
    expect(r.status).toBe(200);
    expect(r.body).toContain('nested');
  });

  it('serves css with the right MIME', async () => {
    server = await startDevServer({ rootDir: dir, port: 0, host: '127.0.0.1', liveReload: false });
    const r = await getText(server.url + 'style.css');
    expect(r.status).toBe(200);
    expect(r.type).toContain('text/css');
    expect(r.body).toBe('body{color:red}');
  });

  it('falls back to 404.html when the path is missing', async () => {
    server = await startDevServer({ rootDir: dir, port: 0, host: '127.0.0.1', liveReload: false });
    const r = await getText(server.url + 'nothing-here/');
    expect(r.status).toBe(404);
    expect(r.body).toContain('custom not found');
  });

  it('does NOT inject the reload script when liveReload is false', async () => {
    server = await startDevServer({ rootDir: dir, port: 0, host: '127.0.0.1', liveReload: false });
    const r = await getText(server.url);
    expect(r.body).not.toContain('__ovellum/reload');
  });

  it('DOES inject the reload script when liveReload is true', async () => {
    server = await startDevServer({ rootDir: dir, port: 0, host: '127.0.0.1', liveReload: true });
    const r = await getText(server.url);
    expect(r.body).toContain('<script src="/__ovellum/reload.js"');
  });

  it('serves the reload client script with a JS content-type', async () => {
    server = await startDevServer({ rootDir: dir, port: 0, host: '127.0.0.1', liveReload: true });
    const r = await getText(server.url + '__ovellum/reload.js');
    expect(r.status).toBe(200);
    expect(r.type).toContain('text/javascript');
    expect(r.body).toContain('EventSource');
  });

  it('rejects path traversal attempts', async () => {
    server = await startDevServer({ rootDir: dir, port: 0, host: '127.0.0.1', liveReload: false });
    const r = await getText(server.url + '../../../etc/passwd');
    // 404 (couldn't resolve) is acceptable; what's NOT acceptable is leaking
    // the file outside rootDir.
    expect(r.body).not.toContain('root:');
    expect(r.status === 404 || r.status === 400).toBe(true);
  });

  it('broadcastReload pushes a reload event to SSE clients', async () => {
    server = await startDevServer({ rootDir: dir, port: 0, host: '127.0.0.1', liveReload: true });

    // Open the SSE stream, wait until we've seen the initial ": connected" line,
    // then trigger a broadcast and expect the "event: reload" line within a beat.
    const res = await fetch(server.url + '__ovellum/events');
    expect(res.headers.get('content-type')).toContain('text/event-stream');

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buf = '';

    // Wait for the initial keep-alive comment so we know the server registered us.
    while (!buf.includes(': connected')) {
      const { value } = await reader.read();
      buf += decoder.decode(value, { stream: true });
    }
    buf = '';

    server.broadcastReload();

    // Give the event loop a tick.
    const deadline = Date.now() + 1000;
    while (!buf.includes('event: reload') && Date.now() < deadline) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
    }
    expect(buf).toContain('event: reload');

    // Cancel the stream so the test exits cleanly.
    await reader.cancel();
  });
});
