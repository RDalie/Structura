import { Injectable, Logger } from '@nestjs/common';
import type { AssignmentNode, NormalizedNode, VariableNode } from '@structura/core';
import { EdgeKind } from '../graph/graph.types';
import { GraphEdgesService, type CreateGraphEdgeInput } from '../graph-edges/graph-edges.service';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { toPosix, toUuid, type NormalizedModulesContext } from './ingestion-utils';

const PATTERN_TYPES = new Set(['object_pattern', 'array_pattern']);

function isPatternNode(node?: NormalizedNode | null) {
  return (
    !!node &&
    node.type === 'Unknown' &&
    typeof node.originalType === 'string' &&
    PATTERN_TYPES.has(node.originalType)
  );
}

function isAmbiguousNode(node?: NormalizedNode | null) {
  if (!node) return true;
  if (node.type === 'Assignment') return true;
  if (node.type === 'Unknown') return true;
  if (isPatternNode(node)) return true;
  return false;
}

function isSupportedLhs(node?: NormalizedNode | null) {
  if (!node || isAmbiguousNode(node)) return false;
  return node.type === 'Identifier' || node.type === 'MemberExpression';
}

function isSupportedRhs(node?: NormalizedNode | null) {
  return !isAmbiguousNode(node);
}

function hasDestructuringName(name: string) {
  return /[{[]/.test(name);
}

@Injectable()
export class AssignmentGraphExtractorService {
  private readonly logger = new Logger(AssignmentGraphExtractorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly graphEdgesService: GraphEdgesService
  ) {}

  async extract(context: NormalizedModulesContext) {
    const { snapshotId, normalizedModules, relativePaths } = context;

    try {
      const edges: CreateGraphEdgeInput[] = [];
      const seen = new Set<string>();
      let totalCandidates = 0;
      let skipped = 0;
      let dedupeSkips = 0;

      const pushEdge = (fromNode: NormalizedNode, toNode: NormalizedNode, filePath: string) => {
        totalCandidates++;

        const fromId = toUuid(fromNode.id);
        const toId = toUuid(toNode.id);
        const key = `${snapshotId}:${fromId}:${toId}:${EdgeKind.Assignment}`;
        if (seen.has(key)) {
          dedupeSkips++;
          return;
        }
        seen.add(key);

        const normalizedPath = toPosix(filePath);
        const relativePath = relativePaths.get(normalizedPath) ?? normalizedPath;
        edges.push({
          fromId,
          toId,
          kind: EdgeKind.Assignment,
          snapshotId,
          filePath: relativePath,
          version: 1,
        });
      };

      const handleVariable = (node: VariableNode) => {
        if (!node.initializer) {
          skipped++;
          return;
        }
        if (!node.name || !node.name.trim()) {
          skipped++;
          return;
        }
        if (hasDestructuringName(node.name)) {
          skipped++;
          return;
        }
        if (!isSupportedRhs(node.initializer)) {
          skipped++;
          return;
        }

        pushEdge(node, node.initializer, node.filePath);
      };

      const handleAssignment = (node: AssignmentNode) => {
        const left = node.left;
        const right = node.right;
        if (!left || !right) {
          skipped++;
          return;
        }
        if (!isSupportedLhs(left) || !isSupportedRhs(right)) {
          skipped++;
          return;
        }
        if (isPatternNode(left) || isPatternNode(right)) {
          skipped++;
          return;
        }

        pushEdge(left, right, node.filePath);
      };

      const traverse = (node?: NormalizedNode) => {
        if (!node) return;

        if (node.type === 'Variable') {
          handleVariable(node);
        } else if (node.type === 'Assignment') {
          handleAssignment(node);
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
          case 'Assignment':
            traverse(node.left);
            traverse(node.right);
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

      if (edges.length > 0) {
        await this.prisma.graphEdge.deleteMany({
          where: { snapshotId, kind: EdgeKind.Assignment },
        });

        await this.graphEdgesService.createGraphEdges(edges);
        this.logger.log(
          `Snapshot ${snapshotId}: persisted ${edges.length} assignment edges (candidates=${totalCandidates}, dedupeSkips=${dedupeSkips}, skipped=${skipped})`
        );
      } else {
        this.logger.log(
          `Snapshot ${snapshotId}: no assignment edges to persist (candidates=${totalCandidates}, dedupeSkips=${dedupeSkips}, skipped=${skipped})`
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Snapshot ${snapshotId}: assignment extraction failed: ${message}`);
    }
  }
}
