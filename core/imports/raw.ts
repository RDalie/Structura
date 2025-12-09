import type { NormalizedNode } from '../types/ast';

// Return the raw code slice for a node, favoring precomputed raw, then byte offsets, then line/col.
export function extractRaw(source: string, node: NormalizedNode): string {
  const maybeRaw = (node as { raw?: string }).raw;
  if (typeof maybeRaw === 'string') {
    return maybeRaw;
  }

  const loc = (node as { location?: any }).location;
  if (loc && typeof loc.startIndex === 'number' && typeof loc.endIndex === 'number') {
    return source.slice(loc.startIndex, loc.endIndex);
  }

  // Fallback: reconstruct from line/column info if byte offsets are absent.
  if (
    loc &&
    typeof loc.startLine === 'number' &&
    typeof loc.endLine === 'number' &&
    typeof loc.startCol === 'number' &&
    typeof loc.endCol === 'number'
  ) {
    const lines = source.split(/\r?\n/);
    const startLine = loc.startLine;
    const endLine = loc.endLine;
    if (startLine === endLine) {
      const line = lines[startLine] ?? '';
      return line.slice(loc.startCol, loc.endCol);
    }
    const first = (lines[startLine] ?? '').slice(loc.startCol);
    const middle = lines.slice(startLine + 1, endLine);
    const last = (lines[endLine] ?? '').slice(0, loc.endCol);
    return [first, ...middle, last].filter(Boolean).join('\n');
  }

  return '';
}
