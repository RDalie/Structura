import { SyntaxNode } from 'tree-sitter';
import type { UnknownNode } from '../../types/ast';
import { base } from './common';

export function normalizeUnknown(
  node: SyntaxNode,
  source: string,
  filePath: string,
  snapshotVersion: string,
  logger: Pick<Console, 'warn'> = console
): UnknownNode {
  logger.warn(
    `[Structura Warning] Unknown Tree Sitter node type "${node.type}" encountered in file ${filePath} at line ${
      node.startPosition.row + 1
    }`
  );

  return {
    ...base(node, 'Unknown', filePath, snapshotVersion),
    raw: source.slice(node.startIndex, node.endIndex),
  };
}
