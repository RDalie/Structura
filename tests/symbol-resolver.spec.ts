import { describe, expect, it } from 'vitest';
import { resolveSymbols } from '../core/symbols/resolver';
import type {
  BlockNode,
  FunctionNode,
  IdentifierNode,
  ModuleNode,
  ParameterNode,
  VariableNode,
} from '../core/types/ast';

const filePath = '/app/file.ts';

const identifier = (id: string, name: string): IdentifierNode => ({
  id,
  type: 'Identifier',
  name,
  filePath,
});

const variable = (
  id: string,
  name: string,
  kind: VariableNode['kind'] = 'let'
): VariableNode => ({
  id,
  type: 'Variable',
  name,
  kind,
  filePath,
  initializer: undefined,
});

const block = (id: string, statements: BlockNode['statements']): BlockNode => ({
  id,
  type: 'Block',
  statements,
  filePath,
});

describe('resolveSymbols', () => {
  it('resolves to the nearest shadowing declaration within nested blocks', () => {
    const outer = variable('var-outer', 'value');
    const inner = variable('var-inner', 'value');
    const innerUse = identifier('id-inner', 'value');
    const outerUse = identifier('id-outer', 'value');

    const module: ModuleNode = {
      id: 'module-1',
      type: 'Module',
      path: filePath,
      filePath,
      body: [outer, block('block-1', [inner, innerUse]), outerUse],
    };

    const { edges } = resolveSymbols({ module, snapshotId: 'snap-1' });
    const resolves = edges
      .filter((edge) => edge.kind === 'ResolvesTo')
      .map(({ fromId, toId }) => ({ fromId, toId }));

    expect(resolves).toEqual([
      { fromId: 'id-inner', toId: 'var-inner' },
      { fromId: 'id-outer', toId: 'var-outer' },
    ]);
  });

  it('resolves through function scopes and parameters with nested blocks', () => {
    const param: ParameterNode = {
      id: 'param-1',
      type: 'Parameter',
      name: 'value',
      filePath,
    };

    const beforeBlockUse = identifier('id-before', 'value');
    const innerVar = variable('var-inner', 'value');
    const innerUse = identifier('id-inner', 'value');

    const fn: FunctionNode = {
      id: 'fn-1',
      type: 'Function',
      name: 'fn',
      params: [param],
      returnType: undefined,
      body: block('fn-body', [beforeBlockUse, block('block-inner', [innerVar, innerUse])]),
      filePath,
    };

    const module: ModuleNode = {
      id: 'module-2',
      type: 'Module',
      path: filePath,
      filePath,
      body: [fn],
    };

    const { edges } = resolveSymbols({ module, snapshotId: 'snap-2' });
    const resolves = edges
      .filter((edge) => edge.kind === 'ResolvesTo')
      .map(({ fromId, toId }) => ({ fromId, toId }));

    expect(resolves).toEqual([
      { fromId: 'id-before', toId: 'param-1' },
      { fromId: 'id-inner', toId: 'var-inner' },
    ]);
  });

  it('treats var declarations as function-scoped even when nested in blocks', () => {
    const varDecl = variable('var-func', 'value', 'var');
    const useAfter = identifier('id-after', 'value');

    const fn: FunctionNode = {
      id: 'fn-2',
      type: 'Function',
      name: 'fnVar',
      params: [],
      returnType: undefined,
      body: block('fn-body-2', [block('inner-block', [varDecl]), useAfter]),
      filePath,
    };

    const module: ModuleNode = {
      id: 'module-3',
      type: 'Module',
      path: filePath,
      filePath,
      body: [fn],
    };

    const { edges } = resolveSymbols({ module, snapshotId: 'snap-3' });
    const resolves = edges
      .filter((edge) => edge.kind === 'ResolvesTo')
      .map(({ fromId, toId }) => ({ fromId, toId }));

    expect(resolves).toEqual([{ fromId: 'id-after', toId: 'var-func' }]);
  });
});
