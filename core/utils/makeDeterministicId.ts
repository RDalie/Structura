import { createHash } from 'crypto';
import { SyntaxNode } from 'tree-sitter';

export function makeDeterministicId(node: SyntaxNode, filePath: string): string {
  const start = node.startPosition;
  const end = node.endPosition;

  const key = `${filePath}:${node.type}:${start.row}:${start.column}:${end.row}:${end.column}`;

  return createHash('sha256').update(key).digest('hex').slice(0, 16);
}
