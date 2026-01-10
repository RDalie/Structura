import { Injectable, Logger } from '@nestjs/common';
import type { IdentifierNode, MemberExpressionNode, NormalizedNode } from '@structura/core';
import { EdgeKind } from '../graph/graph.types';
import { GraphEdgesService, type CreateGraphEdgeInput } from '../graph-edges/graph-edges.service';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { toPosix, toUuid, type NormalizedModulesContext } from './ingestion-utils';

export function isDirectMemberAccess(node?: NormalizedNode | null): node is MemberExpressionNode {
  return !!node && node.type === 'MemberExpression';
}

export function getObjectExpression(node?: NormalizedNode | null): NormalizedNode | null {
  return isDirectMemberAccess(node) ? node.object : null;
}

export function getMemberIdentifier(node?: NormalizedNode | null): IdentifierNode | null {
  return isDirectMemberAccess(node) ? node.property : null;
}

@Injectable()
export class MemberAccessExtractorService {
  private readonly logger = new Logger(MemberAccessExtractorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly graphEdgesService: GraphEdgesService
  ) {}

  async extract(context: NormalizedModulesContext) {
    const { snapshotId, normalizedModules, relativePaths } = context;

    const memberEdges: CreateGraphEdgeInput[] = [];
    const seen = new Set<string>();
    let totalCandidates = 0;
    let missingNodes = 0;
    let dedupeSkips = 0;

    const trackMemberAccess = (node: MemberExpressionNode) => {
      totalCandidates++;

      const objectNode = getObjectExpression(node);
      const propertyNode = getMemberIdentifier(node);
      if (!objectNode || !propertyNode) {
        missingNodes++;
        return;
      }

      const fromId = toUuid(objectNode.id);
      const toId = toUuid(propertyNode.id);
      const key = `${fromId}:${toId}:${EdgeKind.MemberAccess}`;
      if (seen.has(key)) {
        dedupeSkips++;
        return;
      }
      seen.add(key);

      const normalizedPath = toPosix(node.filePath);
      const relativePath = relativePaths.get(normalizedPath) ?? normalizedPath;
      memberEdges.push({
        fromId,
        toId,
        kind: EdgeKind.MemberAccess,
        snapshotId,
        filePath: relativePath,
        version: 1,
      });
    };

    const traverse = (node?: NormalizedNode) => {
      if (!node) return;

      if (isDirectMemberAccess(node)) {
        trackMemberAccess(node);
      }

      switch (node.type) {
        case 'Module':
          node.body.forEach(traverse);
          break;
        case 'Block':
          node.statements.forEach(traverse);
          break;
        case 'ExpressionStatement':
          traverse(node.expression);
          break;
        case 'Function':
          node.params.forEach(traverse);
          traverse(node.body);
          break;
        case 'Call':
          traverse(node.callee);
          node.args.forEach(traverse);
          break;
        case 'Variable':
          traverse(node.initializer);
          break;
        case 'Return':
          traverse(node.value);
          break;
        case 'Conditional':
          traverse(node.condition);
          traverse(node.then);
          if (node.else) {
            traverse(node.else);
          }
          break;
        case 'Loop':
          traverse(node.init);
          traverse(node.condition);
          traverse(node.update);
          traverse(node.body);
          break;
        case 'MemberExpression':
          traverse(node.object);
          break;
        case 'BinaryOp':
          traverse(node.left);
          traverse(node.right);
          break;
        case 'UnaryOp':
          traverse(node.arg);
          break;
        default:
          break;
      }
    };

    for (const module of normalizedModules.values()) {
      traverse(module);
    }

    if (memberEdges.length > 0) {
      await this.prisma.graphEdge.deleteMany({
        where: { snapshotId, kind: EdgeKind.MemberAccess },
      });

      await this.graphEdgesService.createGraphEdges(memberEdges);
      this.logger.log(
        `Snapshot ${snapshotId}: persisted ${memberEdges.length} member access edges (candidates=${totalCandidates}, dedupeSkips=${dedupeSkips}, missingNodes=${missingNodes})`
      );
    } else {
      this.logger.log(
        `Snapshot ${snapshotId}: no member access edges to persist (candidates=${totalCandidates}, dedupeSkips=${dedupeSkips}, missingNodes=${missingNodes})`
      );
    }
  }
}
