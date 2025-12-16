import { describe, it, expect } from 'vitest';
import Parser from 'tree-sitter';
import JavaScript from 'tree-sitter-javascript';
import { normalize } from '../../core/utils/normalize';
import { SNAPSHOT_VERSION } from '../../core/config/snapshotVersion';

describe('conditional normalization', () => {
  it('normalizes if/else statements and keeps ids deterministic', () => {
    const parser = new Parser();
    parser.setLanguage(JavaScript);

    const source = `
      if (flag) foo();
      else bar();
    `;

    const tree = parser.parse(source);
    const node = tree.rootNode.namedChildren.find((child) => child.type === 'if_statement');

    if (!node) {
      throw new Error('If statement not found in parsed tree');
    }

    const first = normalize(node, source, 'test.js', SNAPSHOT_VERSION);
    const second = normalize(node, source, 'test.js', SNAPSHOT_VERSION);

    if (first.type !== 'Conditional' || second.type !== 'Conditional') {
      throw new Error('Expected conditional normalization output');
    }

    expect(first.condition.type).toBe('Identifier');
    expect((first.condition as any).name).toBe('flag');
    expect(first.then.type).toBe('Block');
    const thenCall =
      first.then.statements[0]?.type === 'Call'
        ? first.then.statements[0]
        : (first.then.statements[0] as any)?.expression;
    const elseCall =
      first.else?.statements[0]?.type === 'Call'
        ? first.else?.statements[0]
        : (first.else?.statements[0] as any)?.expression;
    expect(thenCall?.type).toBe('Call');
    expect(elseCall?.type).toBe('Call');
    expect(first.id).toBe(second.id);
  });
});
