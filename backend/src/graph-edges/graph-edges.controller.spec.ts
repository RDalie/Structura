import { BadRequestException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import type { Prisma, GraphEdge } from '../../generated/prisma';
import { EdgeKind } from '../graph/graph.types';
import { GraphEdgesController } from './graph-edges.controller';
import { GraphEdgesService } from './graph-edges.service';

describe('GraphEdgesController', () => {
  let controller: GraphEdgesController;
  let service: jest.Mocked<GraphEdgesService>;
  const sampleEdge: GraphEdge = {
    id: 'edge-1',
    fromId: 'from',
    toId: 'to',
    kind: EdgeKind.Import,
    filePath: 'src/index.ts',
    snapshotId: 'snap-1',
    version: 1,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GraphEdgesController],
      providers: [
        {
          provide: GraphEdgesService,
          useValue: {
            getEdgesForNode: jest.fn(),
            getEdgesForSnapshot: jest.fn(),
            createGraphEdges: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(GraphEdgesController);
    service = module.get(GraphEdgesService);
  });

  it('routes node queries to the service with parsed params', async () => {
    const expected = [sampleEdge];
    service.getEdgesForNode.mockResolvedValue(expected);

    const response = await controller.getEdges({
      snapshotId: 'snap-1',
      nodeId: 'node-1',
      direction: 'incoming',
      kind: 'Import,Call',
      limit: '10',
      offset: '2',
    });

    expect(service.getEdgesForNode).toHaveBeenCalledWith({
      snapshotId: 'snap-1',
      nodeId: 'node-1',
      direction: 'incoming',
      kind: [EdgeKind.Import, EdgeKind.Call],
      limit: 10,
      offset: 2,
    });
    expect(response).toBe(expected);
  });

  it('routes snapshot queries when nodeId is absent', async () => {
    const expected: GraphEdge[] = [];
    service.getEdgesForSnapshot.mockResolvedValue(expected);

    const response = await controller.getEdges({
      snapshotId: 'snap-2',
      filePath: 'src/index.ts',
      kind: 'Import',
      limit: '5',
    });

    expect(service.getEdgesForSnapshot).toHaveBeenCalledWith({
      snapshotId: 'snap-2',
      filePath: 'src/index.ts',
      kind: EdgeKind.Import,
      limit: 5,
      offset: 0,
    });
    expect(response).toBe(expected);
  });

  it('creates edges after validating payload', async () => {
    const expected: Prisma.GraphEdgeCreateManyInput[] = [
      {
        id: 'edge-1',
        fromId: 'from',
        toId: 'to',
        filePath: 'src/index.ts',
        snapshotId: 'snap',
        kind: EdgeKind.Import,
        version: 2,
        createdAt: new Date(),
      },
    ];
    service.createGraphEdges.mockResolvedValue(expected);

    const response = await controller.createEdges({
      edges: [
        {
          fromId: 'from',
          toId: 'to',
          filePath: 'src/index.ts',
          snapshotId: 'snap',
          kind: 'Import' as any,
          version: 2,
        },
      ],
    });

    expect(service.createGraphEdges).toHaveBeenCalledWith([
      {
        id: undefined,
        fromId: 'from',
        toId: 'to',
        filePath: 'src/index.ts',
        snapshotId: 'snap',
        kind: EdgeKind.Import,
        version: 2,
      },
    ]);
    expect(response).toBe(expected);
  });

  it('requires a snapshotId', async () => {
    await expect(controller.getEdges({} as any)).rejects.toThrow(BadRequestException);
  });

  it('rejects invalid kinds', async () => {
    await expect(
      controller.getEdges({ snapshotId: 'snap-3', kind: 'Unknown' } as any)
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects invalid directions', async () => {
    await expect(
      controller.getEdges({ snapshotId: 'snap-4', nodeId: 'node', direction: 'sideways' } as any)
    ).rejects.toThrow(BadRequestException);
  });
});
