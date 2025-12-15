import { SyntaxNode } from 'tree-sitter';
import type { ImportNode } from '../../types/ast';
import { base } from './common';

export function normalizeImport(
  node: SyntaxNode,
  source: string,
  filePath: string,
  snapshotVersion: string
): ImportNode {
  const importClause = node.namedChildren.find((child) => child.type === 'import_clause');
  const moduleSpecifierNode =
    node.childForFieldName?.('source') ??
    node.namedChildren.find((child) => child.type === 'string');

  const importedNames: string[] = [];

  if (importClause) {
    importClause.namedChildren.forEach((child) => {
      if (child.type === 'identifier') {
        importedNames.push(child.text);
        return;
      }

      if (child.type === 'namespace_import') {
        const nsAlias =
          child.childForFieldName?.('name') ??
          child.namedChildren.find((n) => n.type === 'identifier');
        if (nsAlias) importedNames.push(nsAlias.text);
        return;
      }

      if (child.type === 'named_imports') {
        child.namedChildren
          .filter((spec) => spec.type === 'import_specifier')
          .forEach((spec) => {
            const alias =
              spec.childForFieldName?.('alias') ??
              spec.namedChildren.find((n) => n.type === 'identifier' && n !== undefined);
            const name =
              spec.childForFieldName?.('name') ??
              spec.namedChildren.find((n) => n.type === 'identifier');
            const local = alias ?? name;
            if (local) importedNames.push(local.text);
          });
      }
    });
  }

  return {
    ...base(node, 'Import', filePath, snapshotVersion),
    module: moduleSpecifierNode
      ? moduleSpecifierNode.text.replace(/^['"`]/, '').replace(/['"`]$/, '')
      : '',
    imported: importedNames,
    raw: source.slice(node.startIndex, node.endIndex),
  };
}
