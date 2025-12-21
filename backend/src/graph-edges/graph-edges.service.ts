import { Injectable, BadRequestException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { Prisma } from '../../generated/prisma';
import { GraphRepository } from '../graph/graph.repository';
import { EdgeKind } from '../graph/graph.types';
import { PrismaService } from '../infrastructure/prisma/prisma.service';

export type EdgeDirection = 'incoming' | 'outgoing' | 'all';

type NodeEdgeParams = {
  nodeId: string;
  snapshotId: string;
  direction?: EdgeDirection;
  kind?: EdgeKind | EdgeKind[];
  limit?: number;
  offset?: number;
};

type SnapshotEdgeParams = {
  snapshotId: string;
  filePath?: string;
  kind?: EdgeKind | EdgeKind[];
  limit?: number;
  offset?: number;
};

export type CreateGraphEdgeInput = {
  id?: string;
  fromId: string;
  toId: string;
  kind: EdgeKind;
  filePath: string;
  snapshotId: string;
  version?: number;
};

@Injectable()
export class GraphEdgesService {
  constructor(
    private readonly graphRepository: GraphRepository,
    private readonly prisma: PrismaService
  ) {}

  async createGraphEdges(edges: CreateGraphEdgeInput[]) {
    if (!edges || edges.length === 0) {
      throw new BadRequestException('edges array is required');
    }

    const payload: Prisma.GraphEdgeCreateManyInput[] = edges.map((edge) => ({
      id:
        edge.id ??
        makeDeterministicId({
          snapshotId: edge.snapshotId,
          fromId: edge.fromId,
          toId: edge.toId,
          kind: edge.kind,
          version: edge.version ?? 1,
        }),
      fromId: edge.fromId,
      toId: edge.toId,
      kind: edge.kind,
      filePath: edge.filePath,
      snapshotId: edge.snapshotId,
      version: edge.version ?? 1,
    }));

    await this.prisma.graphEdge.createMany({
      data: payload,
      skipDuplicates: true,
    });

    return payload;
  }

  async getEdgesForNode(params: NodeEdgeParams) {
    const { nodeId, snapshotId, direction = 'all', kind, limit = 50, offset = 0 } = params;
    const options = { kind, limit, offset };

    if (direction === 'incoming') {
      return this.graphRepository.getIncomingEdges(nodeId, snapshotId, options);
    }
    if (direction === 'outgoing') {
      return this.graphRepository.getOutgoingEdges(nodeId, snapshotId, options);
    }

    return this.graphRepository.getEdgesForNode(nodeId, snapshotId, options);
  }

  async getEdgesForSnapshot(params: SnapshotEdgeParams) {
    const { snapshotId, filePath, kind, limit = 50, offset = 0 } = params;
    const where: Prisma.GraphEdgeWhereInput = {
      snapshotId,
      ...(filePath && { filePath }),
      ...(kind && { kind: Array.isArray(kind) ? { in: kind } : kind }),
    };

    return this.prisma.graphEdge.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'asc' },
    });
  }
}

function makeDeterministicId(input: {
  snapshotId: string;
  fromId: string;
  toId: string;
  kind: string;
  version: number;
}) {
  const key = `${input.snapshotId}:${input.fromId}:${input.toId}:${input.kind}:${input.version}`;
  const hex = createHash('sha256').update(key).digest('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(
    16,
    20
  )}-${hex.slice(20, 32)}`;
}
