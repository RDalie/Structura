import { SyntaxNode } from 'tree-sitter';
import type {
  AssignmentNode,
  CallNode,
  IdentifierNode,
  LiteralNode,
  MemberExpressionNode,
  NormalizedNode,
} from '../../types/ast';
import { base } from './common';
import type { NormalizeFn } from './common';
import { normalizeUnknown } from './unknown';

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

export function normalizeAssignment(
  node: SyntaxNode,
  source: string,
  filePath: string,
  snapshotVersion: string,
  normalize: NormalizeFn
): AssignmentNode | ReturnType<typeof normalizeUnknown> {
  const leftNode = node.childForFieldName?.('left') ?? node.namedChildren[0];
  const rightNode =
    node.childForFieldName?.('right') ?? node.namedChildren[node.namedChildren.length - 1];

  if (!leftNode || !rightNode) {
    return normalizeUnknown(node, source, filePath, snapshotVersion);
  }

  return {
    ...base(node, 'Assignment', filePath, snapshotVersion),
    left: normalize(leftNode, source, filePath, snapshotVersion),
    right: normalize(rightNode, source, filePath, snapshotVersion),
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

function isMemberExpressionType(node: SyntaxNode) {
  return node.type === 'member_expression' || node.type === 'optional_member_expression';
}

function isStaticPropertyIdentifier(node: SyntaxNode) {
  return (
    node.type === 'property_identifier' ||
    node.type === 'identifier' ||
    node.type === 'private_property_identifier'
  );
}

function withRole<T extends NormalizedNode>(node: T, role: 'object' | 'property'): T {
  const existingData = node.data ?? {};
  return { ...node, data: { ...(existingData as Record<string, unknown>), role } };
}

function unwrapMemberTarget(node: SyntaxNode): SyntaxNode | null {
  if (isMemberExpressionType(node)) {
    return node;
  }

  if (node.type === 'optional_chain') {
    const valueChild = node.childForFieldName?.('value');
    if (valueChild && isMemberExpressionType(valueChild)) {
      return valueChild;
    }

    return node.namedChildren.find((child) => isMemberExpressionType(child)) ?? null;
  }

  return null;
}

// Normalize dot-based member access into a MemberExpression with explicit child roles.
export function normalizeMemberExpression(
  node: SyntaxNode,
  source: string,
  filePath: string,
  snapshotVersion: string,
  normalize: NormalizeFn
): MemberExpressionNode | ReturnType<typeof normalizeUnknown> {
  const target = unwrapMemberTarget(node);
  if (!target) {
    return normalizeUnknown(node, source, filePath, snapshotVersion);
  }

  const objectNode = target.childForFieldName?.('object') ?? target.namedChildren[0];
  const propertyNode = target.childForFieldName?.('property');

  if (!objectNode || !propertyNode || !isStaticPropertyIdentifier(propertyNode)) {
    return normalizeUnknown(node, source, filePath, snapshotVersion);
  }

  const object = withRole(
    normalize(objectNode, source, filePath, snapshotVersion),
    'object'
  );
  const property = withRole(
    normalizeIdentifier(propertyNode, source, filePath, snapshotVersion),
    'property'
  );

  return {
    ...base(node, 'MemberExpression', filePath, snapshotVersion),
    object,
    property,
  };
}
