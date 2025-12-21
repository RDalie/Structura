/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { BadRequestException, Controller, Get, Post, Body, Query } from '@nestjs/common';
import { EDGE_KINDS, EdgeKind } from '../graph/graph.types';
import { CreateGraphEdgeInput, EdgeDirection, GraphEdgesService } from './graph-edges.service';

type GraphEdgeQuery = {
  snapshotId?: string;
  nodeId?: string;
  direction?: string;
  kind?: string | string[];
  filePath?: string;
  limit?: string;
  offset?: string;
};

type CreateGraphEdgesPayload = {
  edges?: Partial<CreateGraphEdgeInput>[];
};

@Controller('graph-edges')
export class GraphEdgesController {
  constructor(private readonly graphEdgesService: GraphEdgesService) {}

  @Post()
  async createEdges(@Body() body: CreateGraphEdgesPayload) {
    if (!body?.edges || !Array.isArray(body.edges) || body.edges.length === 0) {
      throw new BadRequestException('edges (non-empty array) is required');
    }

    const edges: CreateGraphEdgeInput[] = body.edges.map((edge, index) => {
      if (!edge.fromId || !edge.toId || !edge.filePath || !edge.snapshotId) {
        throw new BadRequestException(
          `edge at index ${index} must include fromId, toId, filePath, snapshotId`
        );
      }

      const kind = ensureKind(edge.kind, index);
      const version = edge.version ?? 1;

      if (version <= 0 || !Number.isInteger(version)) {
        throw new BadRequestException(`edge at index ${index} has invalid version`);
      }

      return {
        id: edge.id,
        fromId: edge.fromId,
        toId: edge.toId,
        filePath: edge.filePath,
        snapshotId: edge.snapshotId,
        kind,
        version,
      };
    });

    return this.graphEdgesService.createGraphEdges(edges);
  }

  @Get()
  async getEdges(@Query() query: GraphEdgeQuery) {
    const snapshotId = query.snapshotId?.trim();
    if (!snapshotId) {
      throw new BadRequestException('snapshotId is required');
    }

    const nodeId = query.nodeId?.trim();

    const direction = parseDirection(query.direction);
    const kind = parseKinds(query.kind);
    const limit = parseLimit(query.limit);
    const offset = parseOffset(query.offset);
    const filePath = query.filePath?.trim() || undefined;

    if (nodeId) {
      return this.graphEdgesService.getEdgesForNode({
        nodeId,
        snapshotId,
        direction,
        kind,
        limit,
        offset,
      });
    }

    return this.graphEdgesService.getEdgesForSnapshot({
      snapshotId,
      filePath,
      kind,
      limit,
      offset,
    });
  }
}

function parseKinds(input?: string | string[]): EdgeKind | EdgeKind[] | undefined {
  if (!input) return undefined;

  const rawValues = Array.isArray(input)
    ? input
    : input
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);

  if (rawValues.length === 0) {
    return undefined;
  }

  const parsed = rawValues.map((value) => {
    const match = EDGE_KINDS.find((candidate) => candidate.toLowerCase() === value.toLowerCase());
    if (!match) {
      throw new BadRequestException(
        `Invalid kind "${value}". Valid kinds: ${EDGE_KINDS.join(', ')}.`
      );
    }
    return match;
  });

  return parsed.length === 1 ? parsed[0] : parsed;
}

function parseDirection(input?: string): EdgeDirection {
  if (!input) {
    return 'all';
  }

  const normalized = input.toLowerCase();
  if (normalized === 'incoming' || normalized === 'outgoing' || normalized === 'all') {
    return normalized;
  }

  throw new BadRequestException('direction must be one of incoming, outgoing, or all');
}

function parseLimit(value?: string): number {
  if (!value) return 50;

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new BadRequestException('limit must be a positive integer');
  }
  return parsed;
}

function parseOffset(value?: string): number {
  if (!value) return 0;

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new BadRequestException('offset must be a non-negative integer');
  }
  return parsed;
}

function ensureKind(kind: string | undefined, index: number): EdgeKind {
  if (!kind) {
    throw new BadRequestException(`edge at index ${index} must include kind`);
  }

  const normalized = kind.toLowerCase();
  const match = EDGE_KINDS.find((candidate) => candidate.toLowerCase() === normalized);
  if (!match) {
    throw new BadRequestException(
      `edge at index ${index} has invalid kind "${kind}". Valid kinds: ${EDGE_KINDS.join(', ')}.`
    );
  }
  return match;
}
