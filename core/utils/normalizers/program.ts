import { SyntaxNode } from 'tree-sitter';
import type { ModuleNode } from '../../types/ast';
import { base } from './common';
import type { NormalizeFn } from './common';

export function normalizeProgram(
  node: SyntaxNode,
  source: string,
  filePath: string,
  snapshotVersion: string,
  normalize: NormalizeFn
): ModuleNode {
  const body = node.namedChildren.map((child) =>
    normalize(child, source, filePath, snapshotVersion)
  );
  return {
    ...base(node, 'Module', filePath, snapshotVersion),
    path: filePath,
    body,
  };
}
