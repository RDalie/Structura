import { describe, it, expect } from 'vitest';
import Parser from 'tree-sitter';
import JavaScript from 'tree-sitter-javascript';
import { normalize } from '../../core/utils/normalize';

describe('variable normalization', () => {
  it('normalizes variable declarations and keeps ids deterministic', () => {
    const parser = new Parser();
    parser.setLanguage(JavaScript);

    const source = 'const answer = 42;';
    const tree = parser.parse(source);
    const node = tree.rootNode.namedChildren.find((child) => child.type === 'lexical_declaration');

    if (!node) {
      throw new Error('Variable declaration not found in parsed tree');
    }

    const first = normalize(node, source, 'test.js');
    const second = normalize(node, source, 'test.js');

    if (first.type !== 'Variable' || second.type !== 'Variable') {
      throw new Error('Expected variable normalization output');
    }

    expect(first.kind).toBe('const');
    expect(first.name).toBe('answer');
    expect(first.initializer?.type).toBe('Literal');
    expect((first.initializer as any).value).toBe(42);
    expect(first.id).toBe(second.id);
  });
});
