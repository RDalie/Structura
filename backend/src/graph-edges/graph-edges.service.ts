import { Injectable, BadRequestException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
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
      id: edge.id ?? randomUUID(),
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
