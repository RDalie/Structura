import type { ImportNode } from '../types/ast';
import type { FileImport } from './types';
import { extractRaw } from './raw';

type AddImport = (record: FileImport['imports'][number]) => void;

// Capture explicit ES module imports using local binding names.
export function handleEsImport(node: ImportNode, source: string, addImport: AddImport) {
  addImport({
    kind: 'es6',
    module: node.module,
    importedNames: node.imported,
    line: (node.location?.startLine ?? 0) + 1,
    raw: extractRaw(source, node),
  });
}
