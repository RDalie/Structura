import type {
  AssignmentNode,
  ExpressionStatementNode,
  IdentifierNode,
  MemberExpressionNode,
  ModuleNode,
  NormalizedNode,
  UnknownNode,
  VariableNode,
} from '@structura/core';
import { EdgeKind } from '../graph/graph.types';
import { AssignmentGraphExtractorService } from './assignment-graph-extractor.service';
import { toUuid, type NormalizedModulesContext } from './ingestion-utils';

const snapshotId = 'snapshot-1';

const makeIdentifier = (id: string, name: string, filePath: string): IdentifierNode => ({
  id,
  type: 'Identifier',
  name,
  filePath,
});

const makeVariable = (
  id: string,
  name: string,
  filePath: string,
  initializer?: NormalizedNode
): VariableNode => ({
  id,
  type: 'Variable',
  name,
  kind: 'let',
  filePath,
  initializer,
});

const makeAssignment = (
  id: string,
  filePath: string,
  left: NormalizedNode,
  right: NormalizedNode,
  originalType = 'assignment_expression'
): AssignmentNode => ({
  id,
  type: 'Assignment',
  filePath,
  left,
  right,
  originalType,
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

describe('AssignmentGraphExtractorService', () => {
  let prisma: { graphEdge: { deleteMany: jest.Mock } };
  let graphEdgesService: { createGraphEdges: jest.Mock };
  let service: AssignmentGraphExtractorService;

  beforeEach(() => {
    prisma = { graphEdge: { deleteMany: jest.fn() } };
    graphEdgesService = { createGraphEdges: jest.fn().mockResolvedValue([]) };
    service = new AssignmentGraphExtractorService(prisma as any, graphEdgesService as any);
  });

  it('creates 1 ASSIGNMENT edge for "let a = b"', async () => {
    const filePath = 'src/vars.ts';
    const initializer = makeIdentifier('id-b', 'b', filePath);
    const variable = makeVariable('var-a', 'a', filePath, initializer);
    const module = makeModule('module-1', filePath, [variable]);

    await service.extract(buildContext(module));

    expect(graphEdgesService.createGraphEdges).toHaveBeenCalledWith([
      {
        fromId: toUuid(variable.id),
        toId: toUuid(initializer.id),
        kind: EdgeKind.Assignment,
        snapshotId,
        filePath,
        version: 1,
      },
    ]);
  });

  it('creates 1 ASSIGNMENT edge for "a = b"', async () => {
    const filePath = 'src/assign.ts';
    const left = makeIdentifier('id-a', 'a', filePath);
    const right = makeIdentifier('id-b', 'b', filePath);
    const assignment = makeAssignment('assign-1', filePath, left, right);
    const statement = makeExpressionStatement('stmt-1', filePath, assignment);
    const module = makeModule('module-1', filePath, [statement]);

    await service.extract(buildContext(module));

    expect(graphEdgesService.createGraphEdges).toHaveBeenCalledWith([
      {
        fromId: toUuid(left.id),
        toId: toUuid(right.id),
        kind: EdgeKind.Assignment,
        snapshotId,
        filePath,
        version: 1,
      },
    ]);
  });

  it('creates 1 ASSIGNMENT edge for "obj.x = y"', async () => {
    const filePath = 'src/member.ts';
    const object = makeIdentifier('id-obj', 'obj', filePath);
    const property = makeIdentifier('id-prop', 'x', filePath);
    const member = makeMemberExpression('member-1', filePath, object, property);
    const right = makeIdentifier('id-y', 'y', filePath);
    const assignment = makeAssignment('assign-1', filePath, member, right);
    const statement = makeExpressionStatement('stmt-1', filePath, assignment);
    const module = makeModule('module-1', filePath, [statement]);

    await service.extract(buildContext(module));

    expect(graphEdgesService.createGraphEdges).toHaveBeenCalledWith([
      {
        fromId: toUuid(member.id),
        toId: toUuid(right.id),
        kind: EdgeKind.Assignment,
        snapshotId,
        filePath,
        version: 1,
      },
    ]);
  });

  it('creates 1 ASSIGNMENT edge for "a += b"', async () => {
    const filePath = 'src/augmented.ts';
    const left = makeIdentifier('id-a', 'a', filePath);
    const right = makeIdentifier('id-b', 'b', filePath);
    const assignment = makeAssignment(
      'assign-1',
      filePath,
      left,
      right,
      'augmented_assignment_expression'
    );
    const statement = makeExpressionStatement('stmt-1', filePath, assignment);
    const module = makeModule('module-1', filePath, [statement]);

    await service.extract(buildContext(module));

    expect(graphEdgesService.createGraphEdges).toHaveBeenCalledWith([
      {
        fromId: toUuid(left.id),
        toId: toUuid(right.id),
        kind: EdgeKind.Assignment,
        snapshotId,
        filePath,
        version: 1,
      },
    ]);
  });

  it('creates 0 edges for "let a"', async () => {
    const filePath = 'src/vars.ts';
    const variable = makeVariable('var-a', 'a', filePath);
    const module = makeModule('module-1', filePath, [variable]);

    await service.extract(buildContext(module));

    expect(graphEdgesService.createGraphEdges).not.toHaveBeenCalled();
    expect(prisma.graphEdge.deleteMany).not.toHaveBeenCalled();
  });

  it('creates 0 edges for destructuring', async () => {
    const filePath = 'src/destructure.ts';
    const initializer = makeIdentifier('id-b', 'b', filePath);
    const destructured = makeVariable('var-1', '{ a }', filePath, initializer);
    const pattern: UnknownNode = {
      id: 'pattern-1',
      type: 'Unknown',
      filePath,
      raw: '{ a }',
      originalType: 'object_pattern',
    };
    const right = makeIdentifier('id-c', 'c', filePath);
    const assignment = makeAssignment('assign-1', filePath, pattern, right);
    const statement = makeExpressionStatement('stmt-1', filePath, assignment);
    const module = makeModule('module-1', filePath, [destructured, statement]);

    await service.extract(buildContext(module));

    expect(graphEdgesService.createGraphEdges).not.toHaveBeenCalled();
    expect(prisma.graphEdge.deleteMany).not.toHaveBeenCalled();
  });

  it('dedupes edges across repeated runs', async () => {
    const filePath = 'src/repeat.ts';
    const left = makeIdentifier('id-a', 'a', filePath);
    const right = makeIdentifier('id-b', 'b', filePath);
    const assignment = makeAssignment('assign-1', filePath, left, right);
    const statement = makeExpressionStatement('stmt-1', filePath, assignment);
    const module = makeModule('module-1', filePath, [statement, statement]);
    const context = buildContext(module);

    await service.extract(context);
    await service.extract(context);

    expect(graphEdgesService.createGraphEdges).toHaveBeenCalledTimes(2);
    for (const call of graphEdgesService.createGraphEdges.mock.calls) {
      expect(call[0]).toHaveLength(1);
    }
  });
});
