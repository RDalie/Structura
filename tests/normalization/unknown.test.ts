import { describe, it, expect } from 'vitest';
import Parser from 'tree-sitter';
import JavaScript from 'tree-sitter-javascript';
import { normalize } from '../../core/utils/normalize';
import { SNAPSHOT_VERSION } from '../../core/config/snapshotVersion';

describe('unknown node normalization', () => {
  it('wraps unsupported nodes in UnknownNode with deterministic ids', () => {
    const parser = new Parser();
    parser.setLanguage(JavaScript);

    const source = 'class Example {}';
    const tree = parser.parse(source);
    const node = tree.rootNode.namedChildren.find((child) => child.type === 'class_declaration');

    if (!node) {
      throw new Error('Class declaration not found in parsed tree');
    }

    const first = normalize(node, source, 'test.js', SNAPSHOT_VERSION);
    const second = normalize(node, source, 'test.js', SNAPSHOT_VERSION);

    if (first.type !== 'Unknown' || second.type !== 'Unknown') {
      throw new Error('Expected unknown normalization output');
    }

    expect(first.originalType).toBe('class_declaration');
    expect(first.raw).toBe(source);
    expect(first.location?.startLine).toBe(0);
    expect(first.location?.startCol).toBe(0);
    expect(first.id).toBe(second.id);
  });
});
