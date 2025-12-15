import { describe, it, expect } from 'vitest';
import Parser from 'tree-sitter';
import JavaScript from 'tree-sitter-javascript';
import { normalize } from '../../core/utils/normalize';
import { SNAPSHOT_VERSION } from '../../core/config/snapshotVersion';

describe('literal normalization', () => {
  it('normalizes string literals and keeps ids deterministic', () => {
    const parser = new Parser();
    parser.setLanguage(JavaScript);

    const source = `'hello';`;
    const tree = parser.parse(source);
    const node = tree.rootNode.namedChildren[0]?.namedChildren[0];

    if (!node) {
      throw new Error('Literal node not found in parsed tree');
    }

    const first = normalize(node, source, 'test.js', SNAPSHOT_VERSION);
    const second = normalize(node, source, 'test.js', SNAPSHOT_VERSION);

    if (first.type !== 'Literal' || second.type !== 'Literal') {
      throw new Error('Expected literal normalization output');
    }

    expect(first.literalType).toBe('string');
    expect(first.value).toBe('hello');
    expect(first.id).toBe(second.id);
  });
});
