import type {
  ExpressionStatementNode,
  IdentifierNode,
  MemberExpressionNode,
  ModuleNode,
  NormalizedNode,
} from '@structura/core';
import { EdgeKind } from '../graph/graph.types';
import {
  MemberAccessExtractorService,
  getMemberIdentifier,
  getObjectExpression,
  isDirectMemberAccess,
} from './member-access-extractor.service';
import { toUuid, type NormalizedModulesContext } from './ingestion-utils';

const snapshotId = 'snapshot-1';

const makeIdentifier = (id: string, name: string, filePath: string): IdentifierNode => ({
  id,
  type: 'Identifier',
  name,
  filePath,
});

const makeMemberExpression = (
  id: string,
  filePath: string,
  object: NormalizedNode,
  property: IdentifierNode
): MemberExpressionNode => ({
  id,
  type: 'MemberExpression',
  filePath,
  object,
  property,
});

const makeExpressionStatement = (
  id: string,
  filePath: string,
  expression: NormalizedNode
): ExpressionStatementNode => ({
  id,
  type: 'ExpressionStatement',
  filePath,
  expression,
});

const makeModule = (id: string, filePath: string, body: NormalizedNode[]): ModuleNode => ({
  id,
  type: 'Module',
  filePath,
  path: filePath,
  body,
});

const buildContext = (
  module: ModuleNode,
  relativePaths: Map<string, string> = new Map()
): NormalizedModulesContext => ({
  snapshotId,
  normalizedModules: new Map([[module.filePath, module]]),
  sources: new Map(),
  rootIds: new Map(),
  snapshotFiles: new Set(),
  relativePaths,
});

describe('member access helpers', () => {
  const filePath = 'src/sample.ts';

  it('identifies direct member access nodes', () => {
    const object = makeIdentifier('obj-1', 'profile', filePath);
    const property = makeIdentifier('prop-1', 'name', filePath);
    const member = makeMemberExpression('member-1', filePath, object, property);

    expect(isDirectMemberAccess(member)).toBe(true);
    expect(getObjectExpression(member)).toBe(object);
    expect(getMemberIdentifier(member)).toBe(property);
  });

  it('returns null for non-member access nodes', () => {
    const identifier = makeIdentifier('id-1', 'value', filePath);

    expect(isDirectMemberAccess(identifier)).toBe(false);
    expect(getObjectExpression(identifier)).toBeNull();
    expect(getMemberIdentifier(identifier)).toBeNull();
  });
});

describe('MemberAccessExtractorService', () => {
  let prisma: { graphEdge: { deleteMany: jest.Mock } };
  let graphEdgesService: { createGraphEdges: jest.Mock };
  let service: MemberAccessExtractorService;

  beforeEach(() => {
    prisma = { graphEdge: { deleteMany: jest.fn() } };
    graphEdgesService = { createGraphEdges: jest.fn().mockResolvedValue([]) };
    service = new MemberAccessExtractorService(prisma as any, graphEdgesService as any);
  });

  it('persists direct member access edges', async () => {
    const filePath = '/repo/src/profile.ts';
    const relativePaths = new Map([[filePath, 'src/profile.ts']]);

    const object = makeIdentifier('obj-1', 'profile', filePath);
    const property = makeIdentifier('prop-1', 'name', filePath);
    const member = makeMemberExpression('member-1', filePath, object, property);
    const statement = makeExpressionStatement('stmt-1', filePath, member);
    const module = makeModule('module-1', filePath, [statement]);

    await service.extract(buildContext(module, relativePaths));

    expect(prisma.graphEdge.deleteMany).toHaveBeenCalledWith({
      where: { snapshotId, kind: EdgeKind.MemberAccess },
    });
    expect(graphEdgesService.createGraphEdges).toHaveBeenCalledWith([
      {
        fromId: toUuid(object.id),
        toId: toUuid(property.id),
        kind: EdgeKind.MemberAccess,
        snapshotId,
        filePath: 'src/profile.ts',
        version: 1,
      },
    ]);
  });

  it('persists chained member access as multiple edges', async () => {
    const filePath = 'src/user.ts';

    const object = makeIdentifier('obj-1', 'user', filePath);
    const firstProperty = makeIdentifier('prop-1', 'profile', filePath);
    const firstAccess = makeMemberExpression('member-1', filePath, object, firstProperty);
    const secondProperty = makeIdentifier('prop-2', 'name', filePath);
    const secondAccess = makeMemberExpression('member-2', filePath, firstAccess, secondProperty);
    const statement = makeExpressionStatement('stmt-1', filePath, secondAccess);
    const module = makeModule('module-1', filePath, [statement]);

    await service.extract(buildContext(module));

    const edges = graphEdgesService.createGraphEdges.mock.calls[0][0];
    expect(edges).toHaveLength(2);
    expect(edges).toEqual(
      expect.arrayContaining([
        {
          fromId: toUuid(object.id),
          toId: toUuid(firstProperty.id),
          kind: EdgeKind.MemberAccess,
          snapshotId,
          filePath,
          version: 1,
        },
        {
          fromId: toUuid(firstAccess.id),
          toId: toUuid(secondProperty.id),
          kind: EdgeKind.MemberAccess,
          snapshotId,
          filePath,
          version: 1,
        },
      ])
    );
  });

  it('ignores non-member access nodes', async () => {
    const filePath = 'src/unknown.ts';
    const unknown: NormalizedNode = {
      id: 'unknown-1',
      type: 'Unknown',
      filePath,
      raw: 'user["name"]',
    };
    const statement = makeExpressionStatement('stmt-1', filePath, unknown);
    const module = makeModule('module-1', filePath, [statement]);

    await service.extract(buildContext(module));

    expect(graphEdgesService.createGraphEdges).not.toHaveBeenCalled();
    expect(prisma.graphEdge.deleteMany).not.toHaveBeenCalled();
  });

  it('dedupes identical member access edges', async () => {
    const filePath = 'src/dupe.ts';
    const object = makeIdentifier('obj-1', 'profile', filePath);
    const property = makeIdentifier('prop-1', 'name', filePath);
    const member = makeMemberExpression('member-1', filePath, object, property);
    const first = makeExpressionStatement('stmt-1', filePath, member);
    const second = makeExpressionStatement('stmt-2', filePath, member);
    const module = makeModule('module-1', filePath, [first, second]);

    await service.extract(buildContext(module));

    const edges = graphEdgesService.createGraphEdges.mock.calls[0][0];
    expect(edges).toHaveLength(1);
  });
});
