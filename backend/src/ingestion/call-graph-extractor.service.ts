import { Injectable, Logger } from '@nestjs/common';
import { buildCallEdges } from '@structura/core/calls/call-graph';
import { EdgeKind } from '../graph/graph.types';
import { GraphEdgesService, type CreateGraphEdgeInput } from '../graph-edges/graph-edges.service';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import {
  buildNodeMapWithParents,
  toPosix,
  toUuid,
  type NormalizedModulesContext,
} from './ingestion-utils';

@Injectable()
export class CallGraphExtractorService {
  private readonly logger = new Logger(CallGraphExtractorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly graphEdgesService: GraphEdgesService
  ) {}

  async extract(context: NormalizedModulesContext) {
    const { snapshotId, normalizedModules, rootIds, relativePaths } = context;

    const callEdges: CreateGraphEdgeInput[] = [];
    const callSeen = new Set<string>();
    let totalCandidates = 0;
    let filePathMismatches = 0;
    let dedupeSkips = 0;
    let missingRootIds = 0;

    for (const [filePath, module] of normalizedModules.entries()) {
      const fromId = rootIds.get(filePath);
      if (!fromId) {
        missingRootIds++;
        continue;
      }

      const nodeMap = buildNodeMapWithParents(module);
      const callCandidates = buildCallEdges({
        module,
        nodeMap,
        snapshotId,
        version: 1,
      });

      totalCandidates += callCandidates.length;

      for (const callEdge of callCandidates) {
        const normalizedCallPath = toPosix(callEdge.filePath);
        if (normalizedCallPath !== toPosix(filePath)) {
          filePathMismatches++;
        }

        const hashedFromId = toUuid(callEdge.fromId);
        const hashedToId = toUuid(callEdge.toId);
        const key = `${hashedFromId}:${hashedToId}:${EdgeKind.Call}`;
        if (callSeen.has(key)) {
          dedupeSkips++;
          continue;
        }
        callSeen.add(key);

        const relativePath = relativePaths.get(normalizedCallPath) ?? normalizedCallPath;
        callEdges.push({
          ...callEdge,
          fromId: hashedFromId,
          toId: hashedToId,
          kind: EdgeKind.Call,
          snapshotId,
          filePath: relativePath,
        });
      }
    }

    if (callEdges.length > 0) {
      await this.prisma.graphEdge.deleteMany({
        where: { snapshotId, kind: EdgeKind.Call },
      });
      await this.graphEdgesService.createGraphEdges(callEdges);
      this.logger.log(
        `Snapshot ${snapshotId}: persisted ${callEdges.length} call graph edges (candidates=${totalCandidates}, pathMismatches=${filePathMismatches}, dedupeSkips=${dedupeSkips}, missingRootIds=${missingRootIds})`
      );
    } else {
      this.logger.log(
        `Snapshot ${snapshotId}: no call graph edges to persist (candidates=${totalCandidates}, pathMismatches=${filePathMismatches}, dedupeSkips=${dedupeSkips}, missingRootIds=${missingRootIds})`
      );
    }
  }
}
