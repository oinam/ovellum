import type { Readable, Writable } from 'node:stream';
import { ovellumTools, type McpTool } from './tools.js';
import { listResources, listResourceTemplates, readResource, ResourceNotFound } from './resources.js';
import { ovellumPrompts } from './prompts.js';

/**
 * A minimal, dependency-free MCP server over stdio (newline-delimited JSON-RPC
 * 2.0). Implements enough of the protocol — `initialize`, `tools/*`,
 * `resources/*`, `prompts/*`, `ping` — to make Ovellum a first-class MCP server
 * (M1), without pulling the full MCP SDK (and zod) into the published CLI.
 * `handleMessage` is pure and unit-tested; `runStdio` wires it to streams.
 */

const DEFAULT_PROTOCOL_VERSION = '2024-11-05';

interface JsonRpcMessage {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: Record<string, unknown>;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: unknown;
  error?: { code: number; message: string };
}

export interface McpServer {
  /** Handle one JSON-RPC message; returns a response, or null for notifications. */
  handleMessage(msg: JsonRpcMessage): Promise<JsonRpcResponse | null>;
  /** Run the stdio read/respond loop until the input stream ends. */
  runStdio(stdin: Readable, stdout: Writable): Promise<void>;
}

export function createMcpServer(opts: { cwd: string; version: string }): McpServer {
  const tools = ovellumTools();
  const byName = new Map<string, McpTool>(tools.map((t) => [t.name, t]));
  const prompts = ovellumPrompts();
  const promptByName = new Map(prompts.map((p) => [p.name, p]));

  function ok(id: JsonRpcMessage['id'], result: unknown): JsonRpcResponse {
    return { jsonrpc: '2.0', id: id ?? null, result };
  }
  function fail(id: JsonRpcMessage['id'], code: number, message: string): JsonRpcResponse {
    return { jsonrpc: '2.0', id: id ?? null, error: { code, message } };
  }

  async function handleMessage(msg: JsonRpcMessage): Promise<JsonRpcResponse | null> {
    const { method, id } = msg;
    // Notifications (no id) get no response.
    const isNotification = id === undefined || id === null;

    switch (method) {
      case 'initialize': {
        const requested =
          typeof msg.params?.protocolVersion === 'string'
            ? (msg.params.protocolVersion as string)
            : DEFAULT_PROTOCOL_VERSION;
        return ok(id, {
          protocolVersion: requested,
          capabilities: { tools: {}, resources: {}, prompts: {} },
          serverInfo: { name: 'ovellum', version: opts.version },
        });
      }
      case 'notifications/initialized':
      case 'notifications/cancelled':
        return null;
      case 'ping':
        return ok(id, {});
      case 'tools/list':
        return ok(id, {
          tools: tools.map((t) => ({
            name: t.name,
            description: t.description,
            inputSchema: t.inputSchema,
          })),
        });
      case 'tools/call': {
        const name = typeof msg.params?.name === 'string' ? msg.params.name : '';
        const tool = byName.get(name);
        if (!tool) return fail(id, -32602, `unknown tool: ${name}`);
        const args = (msg.params?.arguments as Record<string, unknown>) ?? {};
        try {
          const payload = await tool.handler(opts.cwd, args);
          return ok(id, {
            content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
            isError: false,
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          return ok(id, { content: [{ type: 'text', text: message }], isError: true });
        }
      }
      case 'resources/list':
        try {
          return ok(id, { resources: await listResources(opts.cwd) });
        } catch (err) {
          return fail(id, -32603, err instanceof Error ? err.message : String(err));
        }
      case 'resources/templates/list':
        return ok(id, { resourceTemplates: listResourceTemplates() });
      case 'resources/read': {
        const uri = typeof msg.params?.uri === 'string' ? msg.params.uri : '';
        try {
          const contents = await readResource(opts.cwd, uri);
          return ok(id, { contents: [contents] });
        } catch (err) {
          const code = err instanceof ResourceNotFound ? err.code : -32603;
          return fail(id, code, err instanceof Error ? err.message : String(err));
        }
      }
      case 'prompts/list':
        return ok(id, {
          prompts: prompts.map((p) => ({
            name: p.name,
            description: p.description,
            arguments: p.arguments,
          })),
        });
      case 'prompts/get': {
        const name = typeof msg.params?.name === 'string' ? msg.params.name : '';
        const prompt = promptByName.get(name);
        if (!prompt) return fail(id, -32602, `unknown prompt: ${name}`);
        const args = (msg.params?.arguments as Record<string, string>) ?? {};
        return ok(id, { description: prompt.description, messages: prompt.render(args) });
      }
      default:
        if (isNotification) return null;
        return fail(id, -32601, `method not found: ${method ?? '(none)'}`);
    }
  }

  async function runStdio(stdin: Readable, stdout: Writable): Promise<void> {
    return new Promise((resolve) => {
      let buffer = '';
      stdin.setEncoding('utf8');
      stdin.on('data', (chunk: string) => {
        buffer += chunk;
        let nl: number;
        // Process every complete newline-delimited message in the buffer.
        const pending: Array<Promise<void>> = [];
        while ((nl = buffer.indexOf('\n')) !== -1) {
          const line = buffer.slice(0, nl).trim();
          buffer = buffer.slice(nl + 1);
          if (line.length === 0) continue;
          pending.push(processLine(line, stdout));
        }
        void Promise.all(pending);
      });
      stdin.on('end', () => resolve());
      stdin.on('close', () => resolve());
    });
  }

  async function processLine(line: string, stdout: Writable): Promise<void> {
    let msg: JsonRpcMessage;
    try {
      msg = JSON.parse(line) as JsonRpcMessage;
    } catch {
      stdout.write(JSON.stringify(fail(null, -32700, 'parse error')) + '\n');
      return;
    }
    const response = await handleMessage(msg);
    if (response) stdout.write(JSON.stringify(response) + '\n');
  }

  return { handleMessage, runStdio };
}
