import { describe, it, expect } from 'vitest';
import type { NormalizedNode } from '../../core/types/ast';
import { buildCallEdges } from '../../core/calls/call-graph';

function makeModule(body: NormalizedNode[]): NormalizedNode {
  return {
    id: 'module-1',
    type: 'Module',
    filePath: '/tmp/file.ts',
    body,
  } as any;
}

function makeBlock(id: string, parentId: string): NormalizedNode {
  return { id, type: 'Block', filePath: '/tmp/file.ts', statements: [], parentId } as any;
}

function makeFunction(id: string, parentId: string, bodyId: string): NormalizedNode {
  return {
    id,
    type: 'Function',
    filePath: '/tmp/file.ts',
    params: [],
    body: makeBlock(bodyId, id) as any,
    parentId,
  } as any;
}

function makeCall(id: string, parentId: string, calleeId: string): NormalizedNode {
  return {
    id,
    type: 'Call',
    filePath: '/tmp/file.ts',
    callee: { id: calleeId, type: 'Identifier', filePath: '/tmp/file.ts', name: 'foo' } as any,
    args: [],
    parentId,
  } as any;
}

describe('buildCallEdges', () => {
  it('creates an edge from enclosing function to callee id', () => {
    const moduleNode = makeModule([]);
    const fn = makeFunction('fn-1', moduleNode.id, 'block-1');
    const call = makeCall('call-1', 'block-1', 'callee-1');

    (fn as any).body.statements.push(call);
    (moduleNode as any).body.push(fn);

    const nodes = new Map<string, NormalizedNode>([
      [moduleNode.id, moduleNode],
      [fn.id, fn],
      [(fn as any).body.id, (fn as any).body],
      [call.id, call],
      [(call as any).callee.id, (call as any).callee],
    ]);

    const edges = buildCallEdges({
      module: moduleNode as any,
      nodeMap: nodes,
      snapshotId: 'snap-1',
      version: 7,
    });

    expect(edges).toHaveLength(1);
    expect(edges[0]).toEqual({
      fromId: 'fn-1',
      toId: 'callee-1',
      kind: 'Call',
      filePath: '/tmp/file.ts',
      snapshotId: 'snap-1',
      version: 7,
    });
  });

  it('deduplicates identical call edges', () => {
    const moduleNode = makeModule([]);
    const fn = makeFunction('fn-dup', moduleNode.id, 'block-dup');
    const call = makeCall('call-dup', 'block-dup', 'callee-dup');

    (fn as any).body.statements.push(call);
    (moduleNode as any).body.push(fn);

    const nodes = new Map<string, NormalizedNode>([
      [moduleNode.id, moduleNode],
      [fn.id, fn],
      [(fn as any).body.id, (fn as any).body],
      [call.id, call],
      [(call as any).callee.id, (call as any).callee],
    ]);

    const edges = buildCallEdges({
      module: moduleNode as any,
      nodeMap: nodes,
      snapshotId: 'snap-dup',
    });

    // Add duplicate call node pointing to same callee/function.
    const duplicate = { ...call, id: 'call-dup-2' };
    (fn as any).body.statements.push(duplicate);
    nodes.set(duplicate.id, duplicate);
    const edgesWithDuplicate = buildCallEdges({
      module: moduleNode as any,
      nodeMap: nodes,
      snapshotId: 'snap-dup',
    });

    expect(edges).toHaveLength(1);
    expect(edgesWithDuplicate).toHaveLength(1);
  });

  it('creates edge from the innermost enclosing function', () => {
    const moduleNode = makeModule([]);
    const outer = makeFunction('fn-outer', moduleNode.id, 'block-outer');
    const inner = makeFunction('fn-inner', outer.body.id, 'block-inner');
    const call = makeCall('call-inner', inner.body.id, 'callee-inner');

    (inner as any).body.statements.push(call);
    (outer as any).body.statements.push(inner);
    (moduleNode as any).body.push(outer);

    const nodes = new Map<string, NormalizedNode>([
      [moduleNode.id, moduleNode],
      [outer.id, outer],
      [(outer as any).body.id, (outer as any).body],
      [inner.id, inner],
      [(inner as any).body.id, (inner as any).body],
      [call.id, call],
      [(call as any).callee.id, (call as any).callee],
    ]);

    const edges = buildCallEdges({
      module: moduleNode as any,
      nodeMap: nodes,
      snapshotId: 'snap-nested',
    });

    expect(edges).toHaveLength(1);
    expect(edges[0]?.fromId).toBe('fn-inner');
    expect(edges[0]?.toId).toBe('callee-inner');
  });

  it('returns empty when no enclosing callable', () => {
    const moduleNode = makeModule([]);
    const call = makeCall('call-top', moduleNode.id, 'callee-top');
    (moduleNode as any).body.push(call);
    const nodes = new Map<string, NormalizedNode>([
      [moduleNode.id, moduleNode],
      [call.id, call],
      [(call as any).callee.id, (call as any).callee],
    ]);

    const edges = buildCallEdges({
      module: moduleNode as any,
      nodeMap: nodes,
      snapshotId: 'snap-2',
    });

    expect(edges).toHaveLength(0);
  });

  it('returns empty when callee id is missing', () => {
    const moduleNode = makeModule([]);
    const fn = makeFunction('fn-missing', moduleNode.id, 'block-missing');
    const call: NormalizedNode = {
      id: 'call-missing',
      type: 'Call',
      filePath: '/tmp/file.ts',
      callee: { type: 'Identifier', filePath: '/tmp/file.ts', name: 'foo' } as any, // no id
      args: [],
      parentId: 'block-missing',
    } as any;

    (fn as any).body.statements.push(call);
    (moduleNode as any).body.push(fn);

    const nodes = new Map<string, NormalizedNode>([
      [moduleNode.id, moduleNode],
      [fn.id, fn],
      [(fn as any).body.id, (fn as any).body],
      [call.id, call],
    ]);

    const edges = buildCallEdges({
      module: moduleNode as any,
      nodeMap: nodes,
      snapshotId: 'snap-3',
    });

    expect(edges).toHaveLength(0);
  });

  it('returns empty on malformed parent chain', () => {
    const moduleNode = makeModule([]);
    const call = makeCall('call-bad', 'missing-parent', 'callee-bad');
    (moduleNode as any).body.push(call);
    const nodes = new Map<string, NormalizedNode>([
      [moduleNode.id, moduleNode],
      [call.id, call],
      [(call as any).callee.id, (call as any).callee],
    ]);

    const edges = buildCallEdges({
      module: moduleNode as any,
      nodeMap: nodes,
      snapshotId: 'snap-4',
    });

    expect(edges).toHaveLength(0);
  });
});
