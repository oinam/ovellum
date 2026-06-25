/**
 * MCP prompts (M1) — curated, guided workflows a client surfaces in its UI.
 * Each renders to seed messages that point the agent at the right tools, in the
 * right order. `document-symbol` is the moat workflow: read a symbol, then write
 * prose into a protected zone that survives regeneration. Pure: no I/O.
 */

export interface McpPromptArgument {
  name: string;
  description?: string;
  required?: boolean;
}

export interface McpPromptMessage {
  role: 'user' | 'assistant';
  content: { type: 'text'; text: string };
}

export interface McpPrompt {
  name: string;
  description: string;
  arguments: McpPromptArgument[];
  render(args: Record<string, string>): McpPromptMessage[];
}

function userMessage(text: string): McpPromptMessage[] {
  return [{ role: 'user', content: { type: 'text', text } }];
}

export function ovellumPrompts(): McpPrompt[] {
  return [
    {
      name: 'set-up-ovellum',
      description: 'Set up Ovellum docs for this project and explain the hybrid contract.',
      arguments: [],
      render: () =>
        userMessage(
          [
            'Set up Ovellum documentation for this project.',
            '',
            '1. Run `npx ovellum init` (or call the ovellum_build tool after creating an',
            '   ovellum.config) to scaffold the config, a starter page, and an AGENTS.md.',
            '2. Pick a mode: `manual` (hand-written Markdown → site), `auto` (generated',
            '   from TS/JS source), or `hybrid` (generated + merged with hand-written',
            '   prose — the default).',
            '3. Explain the hybrid contract to me: generated files regenerate every build;',
            '   hand-written prose survives only inside `<!-- @manual:start --> … <!-- @manual:end -->`',
            '   zones; when an anchor disappears its prose is quarantined as an orphan.',
            '',
            'Use the ovellum_build and ovellum_check tools to verify the result.',
          ].join('\n'),
        ),
    },
    {
      name: 'document-symbol',
      description:
        'Draft documentation for a symbol and write it into a protected zone that survives regeneration.',
      arguments: [
        {
          name: 'symbol',
          description: 'Anchor id (e.g. src/math.ts::add) or symbol name to document.',
          required: true,
        },
      ],
      render: (args) => {
        const symbol = args.symbol ?? '<symbol>';
        return userMessage(
          [
            `Document the symbol \`${symbol}\` in this Ovellum (hybrid) project.`,
            '',
            `1. Call ovellum_query_symbol with id (or name) "${symbol}" to read its`,
            '   signature, params, returns, and any existing description.',
            '2. Draft a clear, accurate prose description (intent, edge cases, examples).',
            '3. Call ovellum_write_zone with the anchor id and your prose, first with',
            '   dryRun: true to preview, then for real. The prose lands in a `@manual`',
            '   protected zone, so it survives every future regeneration.',
            '',
            'Keep it concise and factual — match the surrounding docs.',
          ].join('\n'),
        );
      },
    },
    {
      name: 'review-doc-drift',
      description: 'Review what a rebuild would change and surface orphaned prose to reattach.',
      arguments: [],
      render: () =>
        userMessage(
          [
            'Review documentation drift in this Ovellum project.',
            '',
            '1. Call ovellum_diff to see what a rebuild would change — added, removed,',
            '   changed, and likely-renamed symbols, plus which docs are affected.',
            '2. Call ovellum_list_orphans to find quarantined prose whose anchor is gone;',
            '   for any that are reattachable (anchor back in source) or look like renames,',
            '   recommend where to reattach them.',
            '3. Summarize: what docs need updating, and which orphans to rescue vs delete.',
          ].join('\n'),
        ),
    },
  ];
}
