import { Injectable, Logger } from '@nestjs/common';
import { resolveSymbols, type SymbolEdge } from '@structura/core/symbols/resolver';
import { EdgeKind } from '../graph/graph.types';
import { GraphEdgesService, type CreateGraphEdgeInput } from '../graph-edges/graph-edges.service';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { toPosix, toUuid, type NormalizedModulesContext } from './ingestion-utils';

@Injectable()
export class SymbolGraphExtractor {
  private readonly logger = new Logger(SymbolGraphExtractor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly graphEdgesService: GraphEdgesService
  ) {}

  async extract(context: NormalizedModulesContext) {
    const { snapshotId, normalizedModules, relativePaths } = context;

    const symbolEdges: CreateGraphEdgeInput[] = [];
    const seen = new Set<string>();
    let totalCandidates = 0;
    let invalidKinds = 0;
    let missingIds = 0;
    let dedupeSkips = 0;

    for (const [filePath, module] of normalizedModules.entries()) {
      const { edges } = resolveSymbols({ module, snapshotId, version: 1 });
      const candidates = edges ?? [];

      for (const edge of candidates) {
        totalCandidates++;

        const kind = this.mapEdgeKind(edge);
        if (!kind) {
          invalidKinds++;
          continue;
        }

        if (!edge.fromId || !edge.toId) {
          missingIds++;
          continue;
        }

        const normalizedPath = toPosix(edge.filePath ?? filePath);
        const fromId = toUuid(edge.fromId);
        const toId = toUuid(edge.toId);
        const key = `${fromId}:${toId}:${kind}`;
        if (seen.has(key)) {
          dedupeSkips++;
          continue;
        }
        seen.add(key);

        const relativePath = relativePaths.get(normalizedPath) ?? normalizedPath;
        symbolEdges.push({
          fromId,
          toId,
          kind,
          snapshotId,
          filePath: relativePath,
          version: edge.version ?? 1,
        });
      }
    }

    if (symbolEdges.length > 0) {
      await this.prisma.graphEdge.deleteMany({
        where: { snapshotId, kind: { in: [EdgeKind.ResolvesTo, EdgeKind.Declares] } },
      });

      await this.graphEdgesService.createGraphEdges(symbolEdges);
      this.logger.log(
        `Snapshot ${snapshotId}: persisted ${symbolEdges.length} symbol graph edges (candidates=${totalCandidates}, dedupeSkips=${dedupeSkips}, invalidKinds=${invalidKinds}, missingIds=${missingIds})`
      );
    } else {
      this.logger.log(
        `Snapshot ${snapshotId}: no symbol graph edges to persist (candidates=${totalCandidates}, dedupeSkips=${dedupeSkips}, invalidKinds=${invalidKinds}, missingIds=${missingIds})`
      );
    }
  }

  private mapEdgeKind(edge: SymbolEdge): EdgeKind | null {
    switch (edge.kind) {
      case 'ResolvesTo':
        return EdgeKind.ResolvesTo;
      case 'Declares':
        return EdgeKind.Declares;
      default:
        return null;
    }
  }
}
