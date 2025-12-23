import { describe, it, expect } from 'vitest';
import type { NormalizedNode } from '../../core/types/ast';
import { findEnclosingCallable } from '../../core/calls/findEnclosingCallable';

const moduleNode: NormalizedNode = {
  id: 'module-1',
  type: 'Module',
  filePath: '/tmp/file.ts',
  body: [],
};

const baseFunction: NormalizedNode = {
  id: 'fn-1',
  type: 'Function',
  filePath: '/tmp/file.ts',
  params: [],
  body: { id: 'block-1', type: 'Block', filePath: '/tmp/file.ts', statements: [] } as any,
};

function makeCall(id: string, parentId?: string): NormalizedNode {
  return {
    id,
    type: 'Call',
    filePath: '/tmp/file.ts',
    callee: { id: `${id}-callee`, type: 'Identifier', filePath: '/tmp/file.ts', name: 'foo' } as any,
    args: [],
    parentId,
  } as any;
}

describe('findEnclosingCallable', () => {
  it('returns the immediate enclosing function for a call', () => {
    const call = makeCall('call-1', 'fn-1');

    const nodes = new Map<string, NormalizedNode>([
      [moduleNode.id, moduleNode],
      [baseFunction.id, { ...baseFunction, parentId: moduleNode.id } as any],
      [call.id, call],
    ]);

    const result = findEnclosingCallable(call, nodes);
    expect(result?.id).toBe('fn-1');
  });

  it('returns the nearest nested function', () => {
    const outerFn = { ...baseFunction, id: 'fn-outer', parentId: moduleNode.id } as any;
    const innerFn = { ...baseFunction, id: 'fn-inner', parentId: 'fn-outer' } as any;
    const call = makeCall('call-2', 'fn-inner');

    const nodes = new Map<string, NormalizedNode>([
      [moduleNode.id, moduleNode],
      [outerFn.id, outerFn],
      [innerFn.id, innerFn],
      [call.id, call],
    ]);

    const result = findEnclosingCallable(call, nodes);
    expect(result?.id).toBe('fn-inner');
  });

  it('returns null for a top-level call', () => {
    const call = makeCall('call-3', moduleNode.id);
    const nodes = new Map<string, NormalizedNode>([
      [moduleNode.id, moduleNode],
      [call.id, call],
    ]);

    const result = findEnclosingCallable(call, nodes);
    expect(result).toBeNull();
  });

  it('returns null when the parent chain is malformed', () => {
    const call = makeCall('call-4', 'missing-parent');
    const nodes = new Map<string, NormalizedNode>([
      [moduleNode.id, moduleNode],
      [call.id, call],
    ]);

    const result = findEnclosingCallable(call, nodes);
    expect(result).toBeNull();
  });
});
