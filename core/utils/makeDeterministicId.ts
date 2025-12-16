import { createHash } from 'crypto';
import { SyntaxNode } from 'tree-sitter';

export function makeDeterministicId(
  node: SyntaxNode,
  filePath: string,
  snapshotVersion: string
): string {
  // snapshotVersion scopes identity to a specific analysis schema so changes can intentionally
  // invalidate ids without altering the AST shape or node offsets.
  const start = node.startPosition;
  const end = node.endPosition;

  const key = `${snapshotVersion}:${filePath}:${node.type}:${start.row}:${start.column}:${end.row}:${end.column}`;

  return createHash('sha256').update(key).digest('hex').slice(0, 16);
}
