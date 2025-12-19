// Mock Prisma client runtime to avoid loading generated artifacts.
jest.mock('../../generated/prisma/client', () => {
  class PrismaClient {}
  return { PrismaClient, Prisma: {}, GraphEdge: class {} };
});

// Mock PrismaService so we can inject a lightweight fake.
jest.mock('../infrastructure/prisma/prisma.service', () => ({
  PrismaService: class {},
}));

import { GraphRepository } from './graph.repository';
import { EdgeKind } from './graph.types';
import type { PrismaService } from '../infrastructure/prisma/prisma.service';

type PrismaServiceMock = {
  graphEdge: {
    findMany: jest.Mock;
  };
};

describe('GraphRepository', () => {
  let repo: GraphRepository;
  let prisma: PrismaServiceMock;

  const sampleEdge = { id: 'edge-1' };

  beforeEach(() => {
    prisma = {
      graphEdge: {
        findMany: jest.fn().mockResolvedValue([sampleEdge]),
      },
    };

    repo = new GraphRepository(prisma as unknown as PrismaService);
  });

  it('gets outgoing edges with defaults', async () => {
    const nodeId = 'node-1';
    const snapshotId = 'snap-1';

    const result = await repo.getOutgoingEdges(nodeId, snapshotId);

    expect(prisma.graphEdge.findMany).toHaveBeenCalledWith({
      where: { fromId: nodeId, snapshotId },
      take: 50,
      skip: 0,
      orderBy: { createdAt: 'asc' },
    });
    expect(result).toEqual([sampleEdge]);
  });

  it('gets incoming edges filtered by multiple kinds', async () => {
    const nodeId = 'node-2';
    const snapshotId = 'snap-2';
    const kinds = [EdgeKind.Call, EdgeKind.Import];

    await repo.getIncomingEdges(nodeId, snapshotId, {
      kind: kinds,
      limit: 10,
      offset: 5,
    });

    expect(prisma.graphEdge.findMany).toHaveBeenCalledWith({
      where: { toId: nodeId, snapshotId, kind: { in: kinds } },
      take: 10,
      skip: 5,
      orderBy: { createdAt: 'asc' },
    });
  });

  it('gets all edges for a node filtered by single kind', async () => {
    const nodeId = 'node-3';
    const snapshotId = 'snap-3';
    const kind = EdgeKind.MemberAccess;

    await repo.getEdgesForNode(nodeId, snapshotId, { kind, limit: 5 });

    expect(prisma.graphEdge.findMany).toHaveBeenCalledWith({
      where: {
        snapshotId,
        OR: [{ fromId: nodeId }, { toId: nodeId }],
        kind,
      },
      take: 5,
      skip: 0,
      orderBy: { createdAt: 'asc' },
    });
  });
});
