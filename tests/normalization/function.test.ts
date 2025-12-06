import { describe, it, expect } from 'vitest';
import Parser from 'tree-sitter';
import JavaScript from 'tree-sitter-javascript';
import { normalize } from '../../core/utils/normalize';

describe('function normalization', () => {
  it('normalizes functions with parameters, bodies, and deterministic ids', () => {
    const parser = new Parser();
    parser.setLanguage(JavaScript);

    const source = `
      function greet(name) {
        return name;
      }
    `;

    const tree = parser.parse(source);
    const node = tree.rootNode.namedChildren.find((child) => child.type === 'function_declaration');

    if (!node) {
      throw new Error('Function declaration not found in parsed tree');
    }

    const first = normalize(node, source, 'test.js');
    const second = normalize(node, source, 'test.js');

    if (first.type !== 'Function' || second.type !== 'Function') {
      throw new Error('Expected function normalization output');
    }

    expect(first.name).toBe('greet');
    expect(first.params).toHaveLength(1);
    expect(first.params[0]?.name).toBe('name');
    expect(first.body.type).toBe('Block');
    expect(first.body.statements).toHaveLength(1);
    expect(first.body.statements[0]?.type).toBe('Return');
    expect((first.body.statements[0] as any).value?.type).toBe('Identifier');
    expect((first.body.statements[0] as any).value?.name).toBe('name');
    expect(first.id).toBe(second.id);
  });
});
