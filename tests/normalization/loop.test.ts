import { describe, it, expect } from 'vitest';
import Parser from 'tree-sitter';
import JavaScript from 'tree-sitter-javascript';
import { normalize } from '../../core/utils/normalize';
import { SNAPSHOT_VERSION } from '../../core/config/snapshotVersion';

describe('loop normalization', () => {
  it('normalizes while loops and keeps ids deterministic', () => {
    const parser = new Parser();
    parser.setLanguage(JavaScript);

    const source = 'while (true) foo();';
    const tree = parser.parse(source);
    const node = tree.rootNode.namedChildren.find((child) => child.type === 'while_statement');

    if (!node) {
      throw new Error('While statement not found in parsed tree');
    }

    const first = normalize(node, source, 'test.js', SNAPSHOT_VERSION);
    const second = normalize(node, source, 'test.js', SNAPSHOT_VERSION);

    if (first.type !== 'Loop' || second.type !== 'Loop') {
      throw new Error('Expected loop normalization output');
    }

    expect(first.loopType).toBe('while');
    expect(first.condition?.type).toBe('Literal');
    expect((first.condition as any).value).toBe(true);
    expect(first.body.type).toBe('Block');
    expect(first.body.statements[0]?.type).toBe('Call');
    expect(first.id).toBe(second.id);
  });
});
