export interface ProtectedBlock {
  /** Block ID. Either the explicit `id` attribute or a positional fallback like `manual-block-3`. */
  id: string;
  /** True if `id` was set explicitly via `<!-- @manual:start id="..." -->`. */
  hasExplicitId: boolean;
  /** Raw content between the start and end tags (exclusive). */
  content: string;
  /** 1-based line where the start tag begins. */
  startLine: number;
  /** 1-based line where the end tag ends. */
  endLine: number;
  /** Anchor ID this block is associated with, derived from the nearest preceding `ovellum:anchor` comment. */
  anchorId?: string;
}

export interface ManualDoc {
  filePath: string;
  /** Parsed frontmatter. Empty object if no frontmatter. */
  frontmatter: Record<string, unknown>;
  /** Raw markdown body (frontmatter stripped). */
  content: string;
  /** All protected zones in document order. */
  protectedBlocks: ProtectedBlock[];
  /** Non-fatal advisories — e.g. protected zones relying on a positional ID fallback. */
  warnings: string[];
}
