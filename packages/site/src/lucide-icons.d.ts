/**
 * Lucide ships per-icon `.mjs` files but only a single top-level `.d.ts` for
 * the runtime helper. Declare the per-icon module shape here so we can import
 * individual icons without `any`.
 *
 * Each icon's default export is an `IconNode[]` — a flat array of
 * `[tagName, attrs, children?]` tuples that describes the children of an
 * `<svg>` (no outer `<svg>` wrapper).
 */
declare module 'lucide/dist/esm/icons/*.mjs' {
  type Attrs = Record<string, string | number>;
  type Node = [string, Attrs, Node[]?];
  const icon: Node[];
  export default icon;
}
