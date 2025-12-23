import { Injectable, Logger } from '@nestjs/common';
import { buildCallEdges } from '@structura/core/calls/call-graph';
import { findEnclosingCallable } from '@structura/core/calls/findEnclosingCallable';
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
    const { snapshotId, normalizedModules, rootIds } = context;

    const callEdges: CreateGraphEdgeInput[] = [];
    const callSeen = new Set<string>();
    let totalCandidates = 0;
    let totalCallNodes = 0;
    let callsMissingCallee = 0;
    let callsMissingEnclosing = 0;
    let filePathMismatches = 0;
    let dedupeSkips = 0;
    let missingRootIds = 0;
    let debugLogged = 0;

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

      // Count all call nodes we saw in the module and identify missing pieces for debugging.
      for (const node of nodeMap.values()) {
        if ((node as any).type === 'Call') {
          totalCallNodes++;
          const calleeId = (node as any).callee?.id;
          if (!calleeId) {
            callsMissingCallee++;
          }
          const enclosing = findEnclosingCallable(node as any, nodeMap as any);
          if (!enclosing) {
            callsMissingEnclosing++;
            if (debugLogged < 3) {
              debugLogged++;
              const chain: string[] = [];
              let current: any =
                (nodeMap.get((node as any).id) as any) ?? (node as any);
              while (current) {
                chain.push(current.type);
                const parentId =
                  current.parentId ??
                  (nodeMap.get(current.id) as any | undefined)?.parentId;
                if (!parentId) break;
                current = nodeMap.get(parentId) as any;
              }

              this.logger.warn(
                `Snapshot ${snapshotId}: call node missing enclosing callable in ${filePath}; chain=${chain.join(
                  ' -> '
                )}`
              );
            }
          }
        }
      }

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

        callEdges.push({
          ...callEdge,
          fromId: hashedFromId,
          toId: hashedToId,
          kind: EdgeKind.Call,
          snapshotId,
          filePath: normalizedCallPath,
        });
      }
    }

    if (callEdges.length > 0) {
      await this.prisma.graphEdge.deleteMany({
        where: { snapshotId, kind: EdgeKind.Call },
      });
      await this.graphEdgesService.createGraphEdges(callEdges);
      this.logger.log(
        `Snapshot ${snapshotId}: persisted ${callEdges.length} call graph edges (callNodes=${totalCallNodes}, candidates=${totalCandidates}, missingCallee=${callsMissingCallee}, missingEnclosing=${callsMissingEnclosing}, pathMismatches=${filePathMismatches}, dedupeSkips=${dedupeSkips}, missingRootIds=${missingRootIds})`
      );
    } else {
      this.logger.log(
        `Snapshot ${snapshotId}: no call graph edges to persist (callNodes=${totalCallNodes}, candidates=${totalCandidates}, missingCallee=${callsMissingCallee}, missingEnclosing=${callsMissingEnclosing}, pathMismatches=${filePathMismatches}, dedupeSkips=${dedupeSkips}, missingRootIds=${missingRootIds})`
      );
    }
  }
}
