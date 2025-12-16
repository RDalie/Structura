import { SyntaxNode } from 'tree-sitter';
import type { CallNode, IdentifierNode, LiteralNode } from '../../types/ast';
import { base } from './common';
import type { NormalizeFn } from './common';

export function normalizeIdentifier(
  node: SyntaxNode,
  _source: string,
  filePath: string,
  snapshotVersion: string
): IdentifierNode {
  return {
    ...base(node, 'Identifier', filePath, snapshotVersion),
    name: node.text,
  };
}

export function normalizeLiteral(
  node: SyntaxNode,
  _source: string,
  filePath: string,
  snapshotVersion: string
): LiteralNode {
  let literalType: LiteralNode['literalType'] = 'null';
  let value: LiteralNode['value'] = null;

  if (node.type === 'number') {
    literalType = 'number';
    value = Number(node.text);
  } else if (node.type === 'string') {
    literalType = 'string';
    value = node.text.replace(/^['"`]/, '').replace(/['"`]$/, '');
  } else if (node.type === 'true') {
    literalType = 'boolean';
    value = true;
  } else if (node.type === 'false') {
    literalType = 'boolean';
    value = false;
  }

  return {
    ...base(node, 'Literal', filePath, snapshotVersion),
    value,
    literalType,
  };
}

export function normalizeCall(
  node: SyntaxNode,
  source: string,
  filePath: string,
  snapshotVersion: string,
  normalize: NormalizeFn
): CallNode {
  const calleeNode = node.childForFieldName?.('function') ?? node.namedChildren[0] ?? node;
  const argsNode =
    node.childForFieldName?.('arguments') ??
    node.namedChildren.find((child) => child.type === 'arguments');
  const args = argsNode
    ? argsNode.namedChildren.map((child) => normalize(child, source, filePath, snapshotVersion))
    : [];

  return {
    ...base(node, 'Call', filePath, snapshotVersion),
    callee: normalize(calleeNode, source, filePath, snapshotVersion),
    args,
    raw: source.slice(node.startIndex, node.endIndex),
  };
}
