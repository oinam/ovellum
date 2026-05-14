/** Build a stable anchor ID per DESIGN.md §8.3: `{relativeFilePath}::{symbolPath}`. */
export function anchorId(filePath: string, symbolPath: string): string {
  return `${filePath}::${symbolPath}`;
}

export const MODULE_SYMBOL = '__module__';
