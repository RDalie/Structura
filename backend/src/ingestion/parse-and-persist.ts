import { Logger } from '@nestjs/common';
import * as fs from 'node:fs/promises';
import Parser from 'tree-sitter';
import type { Snapshot } from '../../generated/prisma/client';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { flattenNodes } from './flatten-nodes.js';
import { normalizeAst } from './normalize-ast.js';

export type ParseOutcome = {
  parsed: number;
  normalized: number;
  failed: number;
  total: number;
};

type ParseAndPersistParams = {
  files: string[];
  parser: Parser;
  snapshot: Snapshot;
  prisma: PrismaService;
  logger: Logger;
};

export async function parseAndPersist({
  files,
  parser,
  snapshot,
  prisma,
  logger,
}: ParseAndPersistParams): Promise<ParseOutcome> {
  let parsed = 0;
  let normalized = 0;
  let failed = 0;

  for (const file of files) {
    try {
      const code = await fs.readFile(file, 'utf8');
      const tree = parser.parse(code);

      if (tree.rootNode.hasError) {
        failed++;
        logger.warn(`Parse errors in ${file}`);
        continue;
      }

      parsed++;

      const normalizedNode = normalizeAst(tree, code, file, snapshot.id, logger);
      if (normalizedNode) {
        try {
          const rows = flattenNodes(normalizedNode, snapshot.id);
          if (rows.length > 0) {
            await prisma.astNode.createMany({
              data: rows,
              skipDuplicates: true,
            });
          }
          normalized += rows.length;
        } catch (persistError) {
          const message =
            persistError instanceof Error ? persistError.message : String(persistError);
          logger.warn(`Failed to persist normalized AST for ${file}: ${message}`);
        }
      }
    } catch (error) {
      failed++;
      const message = error instanceof Error ? error.message : String(error);
      logger.warn(`Failed to parse ${file}: ${message}`);
    }
  }

  return { parsed, normalized, failed, total: files.length };
}
