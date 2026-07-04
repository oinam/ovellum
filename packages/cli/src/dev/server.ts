import { createReadStream, realpathSync, statSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import http, { type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import path from 'node:path';

const RELOAD_PATH = '/__ovellum/events';
const RELOAD_SCRIPT_PATH = '/__ovellum/reload.js';

// Tiny client: subscribe to the SSE channel and reload on the `reload` event.
// `error` events fire on disconnect; EventSource reconnects on its own, no
// special handling needed.
const RELOAD_CLIENT_SCRIPT = `(function () {
  if (typeof EventSource !== 'function') return;
  var src = new EventSource('${RELOAD_PATH}');
  src.addEventListener('reload', function () { location.reload(); });
})();`;

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
};

export interface DevServerOptions {
  /** Absolute path of the directory to serve. */
  rootDir: string;
  /** Starting port; the server auto-bumps up to PORT_RANGE times if busy. */
  port: number;
  /** Host to bind. */
  host: string;
  /** When true, HTML responses get a live-reload client injected. */
  liveReload: boolean;
  /** When true, log each request as `METHOD path → status` to stderr. */
  logRequests?: boolean;
}

export interface DevServer {
  /** Final URL the server is listening on (after any port bumping). */
  url: string;
  /** Final port the server bound to. */
  port: number;
  /** Push a `reload` event to every connected SSE client. */
  broadcastReload: () => void;
  /** Stop accepting requests and end open responses. */
  close: () => Promise<void>;
}

const PORT_RANGE = 20;

/**
 * Spin up a dev server for a built `dist/` directory.
 *
 * Routing:
 *   /                        →  <rootDir>/index.html
 *   /foo/                    →  <rootDir>/foo/index.html
 *   /foo/bar.css             →  <rootDir>/foo/bar.css
 *   anything else missing    →  <rootDir>/404.html (or a built-in fallback)
 *
 * When `liveReload` is on, HTML responses get the client script injected
 * before `</body>`, and the server exposes `/__ovellum/events` (SSE) +
 * `/__ovellum/reload.js`.
 *
 * Port-bumping: if `port` is taken, the server tries `port + 1`, `port + 2`,
 * etc. up to `port + 19`. Throws if none are free.
 */
export async function startDevServer(opts: DevServerOptions): Promise<DevServer> {
  const clients = new Set<ServerResponse>();

  const handler = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const url = req.url ?? '/';
    const urlPath = url.split('?')[0] ?? '/';

    if (opts.liveReload && urlPath === RELOAD_PATH) {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });
      // Initial comment line keeps proxies from closing the stream early.
      res.write(': connected\n\n');
      clients.add(res);
      req.on('close', () => clients.delete(res));
      return;
    }

    if (opts.liveReload && urlPath === RELOAD_SCRIPT_PATH) {
      res.writeHead(200, {
        'Content-Type': MIME['.js']!,
        'Cache-Control': 'no-store',
      });
      res.end(RELOAD_CLIENT_SCRIPT);
      return;
    }

    const filePath = resolveFilePath(opts.rootDir, urlPath);
    if (!filePath) {
      await serve404(opts, res);
      return;
    }

    await serveFile(opts, filePath, res);
  };

  // Port 0 means "let the OS pick" — used in tests so they don't race on a
  // fixed port. Otherwise scan upward from the requested port to find one
  // that's free.
  const startingPort =
    opts.port === 0 ? 0 : await findFreePort(opts.host, opts.port, PORT_RANGE);
  const server: Server = http.createServer((req, res) => {
    // Opt-in request log (skips the SSE/reload internals to stay quiet).
    if (opts.logRequests) {
      const p = (req.url ?? '/').split('?')[0] ?? '/';
      if (p !== RELOAD_PATH && p !== RELOAD_SCRIPT_PATH) {
        res.on('finish', () => {
          process.stderr.write(`  ${req.method ?? 'GET'} ${p} → ${res.statusCode}\n`);
        });
      }
    }
    handler(req, res).catch((err) => {
      process.stderr.write(`dev-server error: ${(err as Error).message}\n`);
      if (!res.headersSent) res.writeHead(500);
      res.end('Internal Server Error');
    });
  });
  // Sane defaults so a stalled/slow client can't hold a connection open
  // indefinitely (this binds to localhost by default — see DEFAULT_HOST in the
  // dev/serve commands; pass --host 0.0.0.0 to expose on the network).
  server.requestTimeout = 30_000;
  server.headersTimeout = 15_000;

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(startingPort, opts.host, () => {
      server.off('error', reject);
      resolve();
    });
  });

  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : startingPort;
  const host = opts.host === '0.0.0.0' ? 'localhost' : opts.host;
  const url = `http://${host}:${port}/`;

  return {
    url,
    port,
    broadcastReload(): void {
      for (const res of clients) {
        try {
          res.write('event: reload\ndata: {}\n\n');
        } catch {
          clients.delete(res);
        }
      }
    },
    close: async () =>
      new Promise<void>((resolve) => {
        for (const res of clients) res.end();
        clients.clear();
        server.close(() => resolve());
      }),
  };
}

/**
 * Resolve a URL path to an absolute filesystem path, applying pretty-URL
 * fallback (`/foo/` → `/foo/index.html`). Returns undefined if no file
 * exists. Defends against path-traversal by rejecting any resolved path
 * that escapes the root.
 */
function resolveFilePath(rootDir: string, urlPath: string): string | undefined {
  // Strip query/hash and normalize.
  let p = decodeURIComponent(urlPath);
  if (!p.startsWith('/')) p = '/' + p;
  const candidate = path.normalize(path.join(rootDir, p));
  // path.normalize collapses `..`; ensure we're still under rootDir.
  const rel = path.relative(rootDir, candidate);
  if (rel.startsWith('..') || path.isAbsolute(rel)) return undefined;

  let resolved: string | undefined;
  const stat = statIfExists(candidate);
  if (stat?.isFile()) resolved = candidate;
  else if (stat?.isDirectory()) {
    const indexHtml = path.join(candidate, 'index.html');
    if (statIfExists(indexHtml)?.isFile()) resolved = indexHtml;
  }
  if (!resolved) {
    // Try `<urlPath>.html` for extensionless requests like `/foo`.
    const withHtml = candidate + '.html';
    if (statIfExists(withHtml)?.isFile()) resolved = withHtml;
  }
  if (!resolved) return undefined;

  // The string-level check above defends against `..`, but a symlink inside
  // rootDir could still point outside it. Resolve symlinks on both sides and
  // re-verify containment before serving.
  return containedRealPath(rootDir, resolved);
}

/** `statSync` that treats "vanished between check and use" as absent instead
 *  of throwing (a watched build can delete/replace files mid-request). */
function statIfExists(p: string): ReturnType<typeof statSync> | undefined {
  try {
    return statSync(p);
  } catch {
    return undefined;
  }
}

/** Return `target` only if its real (symlink-resolved) path stays under the
 *  real path of `rootDir`; otherwise undefined. */
function containedRealPath(rootDir: string, target: string): string | undefined {
  try {
    const root = realpathSync(rootDir);
    const real = realpathSync(target);
    if (real === root || real.startsWith(root + path.sep)) return target;
    return undefined;
  } catch {
    return undefined;
  }
}

async function serveFile(
  opts: DevServerOptions,
  filePath: string,
  res: ServerResponse,
): Promise<void> {
  const ext = path.extname(filePath).toLowerCase();
  const type = MIME[ext] ?? 'application/octet-stream';

  // HTML gets in-memory read so we can inject the reload script.
  if (ext === '.html' && opts.liveReload) {
    const raw = await readFile(filePath, 'utf8');
    const injected = injectReloadScript(raw);
    res.writeHead(200, {
      'Content-Type': type,
      'Cache-Control': 'no-store',
    });
    res.end(injected);
    return;
  }

  res.writeHead(200, {
    'Content-Type': type,
    'Cache-Control': opts.liveReload ? 'no-store' : 'public, max-age=0',
  });
  createReadStream(filePath).pipe(res);
}

async function serve404(opts: DevServerOptions, res: ServerResponse): Promise<void> {
  // Prefer the site's own 404.html / 404/index.html so the dev experience
  // matches production behavior.
  const candidates = [
    path.join(opts.rootDir, '404.html'),
    path.join(opts.rootDir, '404', 'index.html'),
  ];
  for (const c of candidates) {
    if (statIfExists(c)?.isFile()) {
      const raw = await readFile(c, 'utf8');
      const body = opts.liveReload ? injectReloadScript(raw) : raw;
      res.writeHead(404, {
        'Content-Type': MIME['.html']!,
        'Cache-Control': 'no-store',
      });
      res.end(body);
      return;
    }
  }
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Not Found');
}

/**
 * Insert the live-reload `<script>` immediately before the closing `</body>`.
 * Falls back to appending at the end if `</body>` isn't present.
 */
export function injectReloadScript(html: string): string {
  const tag = `<script src="${RELOAD_SCRIPT_PATH}" defer></script>`;
  // Use $& to keep the matched </body> exactly as the author wrote it
  // (mixed-case authors get their styling preserved).
  if (/<\/body>/i.test(html)) return html.replace(/<\/body>/i, `${tag}$&`);
  return html + tag;
}

async function findFreePort(host: string, start: number, range: number): Promise<number> {
  for (let p = start; p < start + range; p++) {
    if (await isPortFree(host, p)) return p;
  }
  throw new Error(
    `No free port in ${start}–${start + range - 1} on ${host}. ` +
      `Pass --port to pick a different starting point.`,
  );
}

function isPortFree(host: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const probe = http.createServer();
    probe.once('error', () => resolve(false));
    probe.listen(port, host, () => {
      probe.close(() => resolve(true));
    });
  });
}
