import { SyntaxNode } from 'tree-sitter';
import type { BaseNode, NormalizedNode } from '../../types/ast';
import { makeDeterministicId } from '../makeDeterministicId';

export type NormalizeFn = (
  node: SyntaxNode,
  source: string,
  filePath: string,
  snapshotVersion: string
) => NormalizedNode;

export function base<T extends BaseNode['type']>(
  node: SyntaxNode,
  type: T,
  filePath: string,
  snapshotVersion: string
): BaseNode & { type: T } {
  return {
    id: makeDeterministicId(node, filePath, snapshotVersion),
    type,
    filePath,
    location: toLocation(node),
    originalType: node.type,
  };
}

export function toLocation(node: SyntaxNode) {
  return {
    startLine: node.startPosition.row,
    startCol: node.startPosition.column,
    endLine: node.endPosition.row,
    endCol: node.endPosition.column,
  };
}
