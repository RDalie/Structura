import { describe, it, expect } from 'vitest';
import Parser from 'tree-sitter';
import JavaScript from 'tree-sitter-javascript';
import { normalize } from '../../core/utils/normalize';
import { SNAPSHOT_VERSION } from '../../core/config/snapshotVersion';
import type { NormalizedNode, ModuleNode } from '../../core/types/ast';

// Narrow any normalized root into a Module node; throws if parser returns something unexpected.
function toModule(node: NormalizedNode): ModuleNode {
  if (node.type !== 'Module') {
    throw new Error(`Expected Module root, got ${node.type}`);
  }
  return node as ModuleNode;
}

// Depth-first walk to collect every node id in document order.
function collectIds(node: NormalizedNode, acc: string[] = []): string[] {
  acc.push(node.id);
  switch (node.type) {
    case 'Module':
      node.body.forEach((child) => collectIds(child, acc));
      break;
    case 'Block':
      node.statements.forEach((stmt) => collectIds(stmt, acc));
      break;
    case 'ExpressionStatement':
      collectIds(node.expression, acc);
      break;
    case 'Function':
      collectIds(node.body, acc);
      node.params.forEach((p) => acc.push(p.id));
      break;
    case 'Call':
      collectIds(node.callee, acc);
      node.args.forEach((arg) => collectIds(arg, acc));
      break;
    case 'Variable':
      if (node.initializer) collectIds(node.initializer, acc);
      break;
    case 'Return':
      if (node.value) collectIds(node.value, acc);
      break;
    case 'Conditional':
      collectIds(node.condition, acc);
      collectIds(node.then, acc);
      if (node.else) collectIds(node.else, acc);
      break;
    case 'Loop':
      if (node.init) collectIds(node.init, acc);
      if (node.condition) collectIds(node.condition, acc);
      if (node.update) collectIds(node.update, acc);
      collectIds(node.body, acc);
      break;
    default:
      break;
  }
  return acc;
}

describe('deterministic normalization ids', () => {
  it('produces stable ids for the same source and file path, and different ids when file path changes', () => {
    const parser = new Parser();
    parser.setLanguage(JavaScript as any);

    // Simple sample program to exercise multiple node kinds.
    const source = [
      `import fs from 'fs';`,
      `const x = 1;`,
      `function echo(v) {`,
      `  return v;`,
      `}`,
      `echo(x);`,
    ].join('\n');

    // Parse the same source three times; two share a path/version, one uses a different path, and later we also vary version.
    const treeA1 = parser.parse(source);
    const treeA2 = parser.parse(source);
    const treeB = parser.parse(source);

    const modA1 = toModule(
      normalize(treeA1.rootNode, source, '/tmp/fileA.js', SNAPSHOT_VERSION)
    );
    const modA2 = toModule(
      normalize(treeA2.rootNode, source, '/tmp/fileA.js', SNAPSHOT_VERSION)
    );
    const modB = toModule(
      normalize(treeB.rootNode, source, '/tmp/fileB.js', SNAPSHOT_VERSION)
    );
    const modAVersion2 = toModule(
      normalize(treeA1.rootNode, source, '/tmp/fileA.js', 'v2')
    );

    // Collect all ids to assert whole-tree stability, not just the root.
    const idsA1 = collectIds(modA1);
    const idsA2 = collectIds(modA2);
    const idsB = collectIds(modB);
    const idsAVersion2 = collectIds(modAVersion2);

    // Same source + same filePath => identical ids.
    expect(idsA1.length).toBeGreaterThan(0);
    expect(idsA1).toEqual(idsA2);

    // Same source + different filePath => ids diverge (filePath participates in identity).
    expect(idsB.length).toBe(idsA1.length);
    expect(idsB).not.toEqual(idsA1);
    expect(modB.id).not.toBe(modA1.id);

    // Same source + same filePath but different snapshotVersion => ids diverge.
    expect(idsAVersion2.length).toBe(idsA1.length);
    expect(idsAVersion2).not.toEqual(idsA1);
    expect(modAVersion2.id).not.toBe(modA1.id);
  });
});
