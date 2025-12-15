import { describe, it, expect } from 'vitest';
import Parser from 'tree-sitter';
import JavaScript from 'tree-sitter-javascript';
import { normalize } from '../../core/utils/normalize';
import { SNAPSHOT_VERSION } from '../../core/config/snapshotVersion';

describe('call normalization', () => {
  it('normalizes call expressions and keeps ids deterministic', () => {
    const parser = new Parser();
    parser.setLanguage(JavaScript as any);

    const source = `foo("bar");`;
    const tree = parser.parse(source);
    const expression = tree.rootNode.namedChildren.find(
      (child) => child.type === 'expression_statement'
    );
    const node = expression?.namedChildren[0];

    if (!node) {
      throw new Error('Call expression not found in parsed tree');
    }

    const first = normalize(node, source, 'test.js', SNAPSHOT_VERSION);
    const second = normalize(node, source, 'test.js', SNAPSHOT_VERSION);

    if (first.type !== 'Call' || second.type !== 'Call') {
      throw new Error('Expected call normalization output');
    }

    expect(first.callee.type).toBe('Identifier');
    expect((first.callee as any).name).toBe('foo');
    expect(first.args).toHaveLength(1);
    expect(first.args[0]?.type).toBe('Literal');
    expect((first.args[0] as any).value).toBe('bar');
    expect(first.id).toBe(second.id);
  });
});
