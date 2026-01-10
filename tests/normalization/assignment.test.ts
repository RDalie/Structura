import { describe, it, expect } from 'vitest';
import Parser from 'tree-sitter';
import JavaScript from 'tree-sitter-javascript';
import { normalize } from '../../core/utils/normalize';
import { SNAPSHOT_VERSION } from '../../core/config/snapshotVersion';

describe('assignment normalization', () => {
  it('normalizes assignment expressions with left/right child nodes', () => {
    const parser = new Parser();
    parser.setLanguage(JavaScript as any);

    const source = 'answer = 42;';
    const tree = parser.parse(source);
    const expression = tree.rootNode.namedChildren.find(
      (child) => child.type === 'expression_statement'
    );
    const node = expression?.namedChildren[0];

    if (!node) {
      throw new Error('Assignment expression not found in parsed tree');
    }

    const first = normalize(node, source, 'test.js', SNAPSHOT_VERSION);
    const second = normalize(node, source, 'test.js', SNAPSHOT_VERSION);

    if (first.type !== 'Assignment' || second.type !== 'Assignment') {
      throw new Error('Expected assignment normalization output');
    }

    expect(first.left.type).toBe('Identifier');
    expect((first.left as any).name).toBe('answer');
    expect(first.right.type).toBe('Literal');
    expect((first.right as any).value).toBe(42);
    expect(first.id).toBe(second.id);
  });

  it('normalizes augmented assignment expressions as Assignment', () => {
    const parser = new Parser();
    parser.setLanguage(JavaScript as any);

    const source = 'count += delta;';
    const tree = parser.parse(source);
    const expression = tree.rootNode.namedChildren.find(
      (child) => child.type === 'expression_statement'
    );
    const node = expression?.namedChildren[0];

    if (!node) {
      throw new Error('Augmented assignment expression not found in parsed tree');
    }

    const normalized = normalize(node, source, 'test.js', SNAPSHOT_VERSION);

    if (normalized.type !== 'Assignment') {
      throw new Error('Expected augmented assignment to normalize as Assignment');
    }

    expect(normalized.left.type).toBe('Identifier');
    expect((normalized.left as any).name).toBe('count');
    expect(normalized.right.type).toBe('Identifier');
    expect((normalized.right as any).name).toBe('delta');
  });

  it('preserves structured left/right child nodes for member access', () => {
    const parser = new Parser();
    parser.setLanguage(JavaScript as any);

    const source = 'profile.name = value;';
    const tree = parser.parse(source);
    const expression = tree.rootNode.namedChildren.find(
      (child) => child.type === 'expression_statement'
    );
    const node = expression?.namedChildren[0];

    if (!node) {
      throw new Error('Assignment expression not found in parsed tree');
    }

    const normalized = normalize(node, source, 'test.js', SNAPSHOT_VERSION);

    if (normalized.type !== 'Assignment') {
      throw new Error('Expected assignment normalization output');
    }

    expect(normalized.left.type).toBe('MemberExpression');
    expect((normalized.left as any).object?.type).toBe('Identifier');
    expect((normalized.left as any).property?.type).toBe('Identifier');
    expect(normalized.right.type).toBe('Identifier');
    expect((normalized.right as any).name).toBe('value');
  });
});
