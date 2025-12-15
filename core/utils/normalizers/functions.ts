import { SyntaxNode } from 'tree-sitter';
import type { BlockNode, FunctionNode, ParameterNode } from '../../types/ast';
import { base } from './common';
import type { NormalizeFn } from './common';

export function normalizeFunction(
  node: SyntaxNode,
  source: string,
  filePath: string,
  snapshotVersion: string,
  normalize: NormalizeFn
): FunctionNode {
  const nameNode =
    node.childForFieldName?.('name') ??
    node.namedChildren.find((child) => child.type === 'identifier');
  const paramsNode =
    node.childForFieldName?.('parameters') ??
    node.namedChildren.find((child) => child.type === 'formal_parameters');
  const bodyNode =
    node.childForFieldName?.('body') ??
    node.namedChildren.find(
      (child) =>
        child.type === 'statement_block' ||
        child.type === 'expression_statement' ||
        child.type === 'expression'
    );

  const params: ParameterNode[] = paramsNode
    ? paramsNode.namedChildren.map((param) => ({
        ...base(param, 'Parameter', filePath, snapshotVersion),
        name: param.text,
        paramType: undefined,
      }))
    : [];

  const bodyStatements = bodyNode
    ? bodyNode.namedChildren.map((child) => normalize(child, source, filePath, snapshotVersion))
    : [];
  const body: BlockNode = {
    ...base(bodyNode ?? node, 'Block', filePath, snapshotVersion),
    statements: bodyStatements,
  };

  return {
    ...base(node, 'Function', filePath, snapshotVersion),
    name: nameNode ? nameNode.text : undefined,
    params,
    returnType: undefined,
    body,
  };
}
