import { describe, it, expect } from 'vitest';
import Parser from 'tree-sitter';
import JavaScript from 'tree-sitter-javascript';
import { normalize } from '../../core/utils/normalize';

describe('identifier normalization', () => {
  it('normalizes identifiers and keeps ids deterministic', () => {
    const parser = new Parser();
    parser.setLanguage(JavaScript);

    const source = 'x;';
    const tree = parser.parse(source);
    const node = tree.rootNode.namedChildren[0]?.namedChildren[0];

    if (!node) {
      throw new Error('Identifier node not found in parsed tree');
    }

    const first = normalize(node, source, 'test.js');
    const second = normalize(node, source, 'test.js');

    if (first.type !== 'Identifier' || second.type !== 'Identifier') {
      throw new Error('Expected identifier normalization output');
    }

    expect(first.name).toBe('x');
    expect(first.id).toBe(second.id);
  });
});
