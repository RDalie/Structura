import { Logger } from '@nestjs/common';
import Parser from 'tree-sitter';
import { SNAPSHOT_VERSION, normalize, type NormalizedNode } from '@structura/core';

export function normalizeAst(
  tree: Parser.Tree,
  source: string,
  filePath: string,
  snapshotId: string,
  logger: Pick<Logger, 'warn'>
): NormalizedNode | null {
  try {
    return normalize(tree.rootNode, source, filePath, `${SNAPSHOT_VERSION}:${snapshotId}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn(`Failed to normalize ${filePath}: ${message}`);
    return null;
  }
}
