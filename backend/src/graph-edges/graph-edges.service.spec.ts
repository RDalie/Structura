import { EdgeKind } from '../graph/graph.types';
import { GraphEdgesService } from './graph-edges.service';

describe('GraphEdgesService', () => {
  let service: GraphEdgesService;
  const graphRepository = {
    getIncomingEdges: jest.fn(),
    getOutgoingEdges: jest.fn(),
    getEdgesForNode: jest.fn(),
  };
  const prisma = {
    graphEdge: {
      findMany: jest.fn(),
      createMany: jest.fn(),
    },
  };

  beforeEach(() => {
    graphRepository.getIncomingEdges.mockReset();
    graphRepository.getOutgoingEdges.mockReset();
    graphRepository.getEdgesForNode.mockReset();
    prisma.graphEdge.findMany.mockReset();
    prisma.graphEdge.createMany.mockReset();

    service = new GraphEdgesService(graphRepository as any, prisma as any);
  });

  it('delegates node queries to the graph repository based on direction', async () => {
    graphRepository.getIncomingEdges.mockResolvedValue(['incoming']);
    graphRepository.getOutgoingEdges.mockResolvedValue(['outgoing']);
    graphRepository.getEdgesForNode.mockResolvedValue(['all']);

    await service.getEdgesForNode({
      nodeId: 'node-1',
      snapshotId: 'snap-1',
      direction: 'incoming',
      kind: EdgeKind.Import,
      limit: 5,
      offset: 2,
    });
    expect(graphRepository.getIncomingEdges).toHaveBeenCalledWith('node-1', 'snap-1', {
      kind: EdgeKind.Import,
      limit: 5,
      offset: 2,
    });

    await service.getEdgesForNode({
      nodeId: 'node-1',
      snapshotId: 'snap-1',
      direction: 'outgoing',
    });
    expect(graphRepository.getOutgoingEdges).toHaveBeenCalledWith('node-1', 'snap-1', {
      kind: undefined,
      limit: 50,
      offset: 0,
    });

    await service.getEdgesForNode({
      nodeId: 'node-1',
      snapshotId: 'snap-1',
    });
    expect(graphRepository.getEdgesForNode).toHaveBeenCalledWith('node-1', 'snap-1', {
      kind: undefined,
      limit: 50,
      offset: 0,
    });
  });

  it('returns edges for a snapshot with optional filters', async () => {
    prisma.graphEdge.findMany.mockResolvedValue(['edge-1']);

    const result = await service.getEdgesForSnapshot({
      snapshotId: 'snap-2',
      filePath: 'src/index.ts',
      kind: [EdgeKind.Call, EdgeKind.Import],
      limit: 10,
      offset: 1,
    });

    expect(prisma.graphEdge.findMany).toHaveBeenCalledWith({
      where: {
        snapshotId: 'snap-2',
        filePath: 'src/index.ts',
        kind: { in: [EdgeKind.Call, EdgeKind.Import] },
      },
      take: 10,
      skip: 1,
      orderBy: { createdAt: 'asc' },
    });
    expect(result).toEqual(['edge-1']);
  });

  it('creates edges with defaults and skips duplicates', async () => {
    prisma.graphEdge.createMany.mockResolvedValue({ count: 1 });

    const edges = [
      {
        fromId: 'from',
        toId: 'to',
        filePath: 'src/index.ts',
        snapshotId: 'snap',
        kind: EdgeKind.Import,
      },
    ];

    const result = await service.createGraphEdges(edges);

    const firstCall = result[0]?.id;

    expect(prisma.graphEdge.createMany).toHaveBeenCalledWith({
      data: [
        {
          id: firstCall,
          fromId: 'from',
          toId: 'to',
          filePath: 'src/index.ts',
          snapshotId: 'snap',
          kind: EdgeKind.Import,
          version: 1,
        },
      ],
      skipDuplicates: true,
    });
    expect(firstCall).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);

    // Deterministic: calling again with the same input yields the same id.
    const again = await service.createGraphEdges(edges);
    expect(again[0]?.id).toBe(firstCall);
  });

  it('rejects empty edge payloads', async () => {
    await expect(service.createGraphEdges([] as any)).rejects.toThrow();
  });
});
