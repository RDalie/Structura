import { describe, it, expect } from 'vitest';
import Parser from 'tree-sitter';
import JavaScript from 'tree-sitter-javascript';
import { normalize } from '../../core/utils/normalize';
import { SNAPSHOT_VERSION } from '../../core/config/snapshotVersion';

describe('member expression normalization', () => {
  it('normalizes static member access and marks child roles', () => {
    const parser = new Parser();
    parser.setLanguage(JavaScript as any);

    const source = 'profile.name';
    const tree = parser.parse(source);
    const expression = tree.rootNode.namedChildren.find(
      (child) => child.type === 'expression_statement'
    );
    const node = expression?.namedChildren[0];

    if (!node) {
      throw new Error('Member expression not found in parsed tree');
    }

    const normalized = normalize(node, source, 'test.js', SNAPSHOT_VERSION);

    if (normalized.type !== 'MemberExpression') {
      throw new Error('Expected MemberExpression normalization output');
    }

    expect(normalized.object.type).toBe('Identifier');
    expect((normalized.object as any).name).toBe('profile');
    expect((normalized.object as any).data?.role).toBe('object');
    expect(normalized.property.type).toBe('Identifier');
    expect((normalized.property as any).name).toBe('name');
    expect((normalized.property as any).data?.role).toBe('property');
  });

  it('handles optional chaining member access', () => {
    const parser = new Parser();
    parser.setLanguage(JavaScript as any);

    const source = 'profile?.name';
    const tree = parser.parse(source);
    const expression = tree.rootNode.namedChildren.find(
      (child) => child.type === 'expression_statement'
    );
    const node = expression?.namedChildren[0];

    if (!node) {
      throw new Error('Optional member expression not found in parsed tree');
    }

    const normalized = normalize(node, source, 'test.js', SNAPSHOT_VERSION);

    if (normalized.type !== 'MemberExpression') {
      throw new Error('Expected MemberExpression normalization output');
    }

    expect((normalized.object as any).data?.role).toBe('object');
    expect((normalized.property as any).data?.role).toBe('property');
  });

  it('leaves computed member access as Unknown', () => {
    const parser = new Parser();
    parser.setLanguage(JavaScript as any);

    const source = 'obj["name"]';
    const tree = parser.parse(source);
    const expression = tree.rootNode.namedChildren.find(
      (child) => child.type === 'expression_statement'
    );
    const node = expression?.namedChildren[0];

    if (!node) {
      throw new Error('Computed member expression not found in parsed tree');
    }

    const normalized = normalize(node, source, 'test.js', SNAPSHOT_VERSION);
    expect(normalized.type).toBe('Unknown');
    expect(normalized.originalType).toBe('subscript_expression');
  });
});
