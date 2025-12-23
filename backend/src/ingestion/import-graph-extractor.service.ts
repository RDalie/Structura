import { Injectable, Logger } from '@nestjs/common';
import { extractImportsFromModule } from '@structura/core/imports/extractor';
import { resolveImport } from '@structura/core/imports/import-resolver';
import { EdgeKind } from '../graph/graph.types';
import { GraphEdgesService, type CreateGraphEdgeInput } from '../graph-edges/graph-edges.service';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { toPosix, type NormalizedModulesContext } from './ingestion-utils';

@Injectable()
export class ImportGraphExtractorService {
  private readonly logger = new Logger(ImportGraphExtractorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly graphEdgesService: GraphEdgesService
  ) {}

  async extract(context: NormalizedModulesContext) {
    const { snapshotId, normalizedModules, snapshotFiles, rootIds, sources, relativePaths } =
      context;

    const importEdges: CreateGraphEdgeInput[] = [];
    const importSeen = new Set<string>();

    for (const [filePath, module] of normalizedModules.entries()) {
      const fromId = rootIds.get(filePath);
      if (!fromId) continue;

      const source = sources.get(filePath) ?? '';
      const extracted = extractImportsFromModule(module, source);
      for (const record of extracted.imports) {
        const resolution = resolveImport(filePath, record.module);
        if (!resolution.ok || !resolution.resolvedPath) continue;

        const targetPath = toPosix(resolution.resolvedPath);
        if (!snapshotFiles.has(targetPath)) continue;

        const toId = rootIds.get(targetPath);
        if (!toId) continue;

        const key = `${snapshotId}:${fromId}:${toId}:${EdgeKind.Import}`;
        if (importSeen.has(key)) continue;
        importSeen.add(key);

        const relativePath = relativePaths.get(filePath) ?? filePath;
        importEdges.push({
          fromId,
          toId,
          kind: EdgeKind.Import,
          filePath: relativePath,
          snapshotId,
          version: 1,
        });
      }
    }

    if (importEdges.length > 0) {
      await this.prisma.graphEdge.deleteMany({
        where: { snapshotId, kind: EdgeKind.Import },
      });

      await this.graphEdgesService.createGraphEdges(importEdges);
      this.logger.log(`Snapshot ${snapshotId}: persisted ${importEdges.length} import graph edges`);
    } else {
      this.logger.log(`Snapshot ${snapshotId}: no resolved imports to persist as graph edges`);
    }
  }
}
