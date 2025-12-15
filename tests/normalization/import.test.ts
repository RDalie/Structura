import { describe, it, expect } from 'vitest';
import Parser from 'tree-sitter';
import JavaScript from 'tree-sitter-javascript';
import { normalize } from '../../core/utils/normalize';
import { SNAPSHOT_VERSION } from '../../core/config/snapshotVersion';

function normalizeFirstImport(source: string) {
  const parser = new Parser();
  parser.setLanguage(JavaScript as any);
  const tree = parser.parse(source);
  const importNode = tree.rootNode.namedChildren.find((child) => child.type === 'import_statement');
  if (!importNode) throw new Error('Import node not found');
  const normalized = normalize(importNode, source, 'test.js', SNAPSHOT_VERSION);
  if (normalized.type !== 'Import') throw new Error('Expected Import node');
  return normalized;
}

describe('import normalization', () => {
  it('captures default import', () => {
    const node = normalizeFirstImport(`import axios from 'axios';`);
    expect(node.imported).toEqual(['axios']);
  });

  it('captures named imports (with alias)', () => {
    const node = normalizeFirstImport(
      `import { parseVersion as parseVersionFn, helper } from './x';`
    );
    expect(node.imported).toEqual(['parseVersionFn', 'helper']);
  });

  it('captures default plus named', () => {
    const node = normalizeFirstImport(`import axios, { AxiosError } from 'axios';`);
    expect(node.imported).toEqual(['axios', 'AxiosError']);
  });

  it('captures namespace import', () => {
    const node = normalizeFirstImport(`import * as utils from './utils';`);
    expect(node.imported).toEqual(['utils']);
  });

  it('handles side-effect imports as empty', () => {
    const node = normalizeFirstImport(`import './polyfills.js';`);
    expect(node.imported).toEqual([]);
  });
});
