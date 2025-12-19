import { Injectable } from '@nestjs/common';
import { GraphEdge, Prisma } from '../../generated/prisma';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { type EdgeKind } from './graph.types';

export interface EdgeQueryOptions {
  kind?: EdgeKind | EdgeKind[];
  limit?: number;
  offset?: number;
}

@Injectable()
export class GraphRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getOutgoingEdges(
    nodeId: string,
    snapshotId: string,
    options: EdgeQueryOptions = {}
  ): Promise<GraphEdge[]> {
    const { kind, limit = 50, offset = 0 } = options;

    // Edges that originate from the node in a given snapshot, optionally filtered by kind and paginated
    const where: Prisma.GraphEdgeWhereInput = {
      fromId: nodeId,
      snapshotId,
      ...(kind && {
        kind: Array.isArray(kind) ? { in: kind } : kind,
      }),
    };

    return this.prisma.graphEdge.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'asc' },
    });
  }

  async getIncomingEdges(
    nodeId: string,
    snapshotId: string,
    options: EdgeQueryOptions = {}
  ): Promise<GraphEdge[]> {
    const { kind, limit = 50, offset = 0 } = options;

    // Edges that target the node in a given snapshot, optionally filtered by kind and paginated
    const where: Prisma.GraphEdgeWhereInput = {
      toId: nodeId,
      snapshotId,
      ...(kind && {
        kind: Array.isArray(kind) ? { in: kind } : kind,
      }),
    };

    return this.prisma.graphEdge.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'asc' },
    });
  }

  async getEdgesForNode(
    nodeId: string,
    snapshotId: string,
    options: EdgeQueryOptions = {}
  ): Promise<GraphEdge[]> {
    const { kind, limit = 50, offset = 0 } = options;

    // All edges that either originate from or point to the node within a snapshot, with optional kind filter and pagination
    const where: Prisma.GraphEdgeWhereInput = {
      snapshotId,
      OR: [{ fromId: nodeId }, { toId: nodeId }],
      ...(kind && {
        kind: Array.isArray(kind) ? { in: kind } : kind,
      }),
    };

    return this.prisma.graphEdge.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'asc' },
    });
  }
}
