import { SyntaxNode } from 'tree-sitter';
import type {
  BlockNode,
  ConditionalNode,
  ExpressionStatementNode,
  LoopNode,
  ReturnNode,
  VariableNode,
} from '../../types/ast';
import { base } from './common';
import type { NormalizeFn } from './common';

export function normalizeConditional(
  node: SyntaxNode,
  source: string,
  filePath: string,
  snapshotVersion: string,
  normalize: NormalizeFn
): ConditionalNode {
  const conditionNode = node.childForFieldName?.('condition') ?? node.namedChildren[0] ?? node;
  const consequenceNode = node.childForFieldName?.('consequence') ?? node.namedChildren[1];
  const alternativeNode = node.childForFieldName?.('alternative') ?? node.namedChildren[2];

  const thenBlock: BlockNode = {
    ...base(consequenceNode ?? node, 'Block', filePath, snapshotVersion),
    statements: consequenceNode
      ? consequenceNode.namedChildren.map((child) =>
          normalize(child, source, filePath, snapshotVersion)
        )
      : [],
  };

  const elseBlock =
    alternativeNode !== undefined
      ? {
          ...base(alternativeNode, 'Block', filePath, snapshotVersion),
          statements: alternativeNode.namedChildren.map((child) =>
            normalize(child, source, filePath, snapshotVersion)
          ),
        }
      : undefined;

  return {
    ...base(node, 'Conditional', filePath, snapshotVersion),
    condition: normalize(conditionNode, source, filePath, snapshotVersion),
    then: thenBlock,
    else: elseBlock,
  };
}

export function normalizeLoop(
  node: SyntaxNode,
  source: string,
  filePath: string,
  snapshotVersion: string,
  normalize: NormalizeFn
): LoopNode {
  let loopType: LoopNode['loopType'] = 'for';
  if (node.type === 'while_statement') loopType = 'while';
  if (node.type === 'do_statement') loopType = 'do-while';
  if (node.type === 'for_of_statement') loopType = 'for-of';
  if (node.type === 'for_in_statement') loopType = 'for-in';

  const initNode = node.childForFieldName?.('initializer') ?? node.childForFieldName?.('left');
  const conditionNode =
    node.childForFieldName?.('condition') ??
    node.childForFieldName?.('right') ??
    node.childForFieldName?.('test');
  const updateNode = node.childForFieldName?.('update');
  const bodyNode =
    node.childForFieldName?.('body') ??
    node.namedChildren.find((child) => child.type === 'statement_block');

  return {
    ...base(node, 'Loop', filePath, snapshotVersion),
    loopType,
    init: initNode ? normalize(initNode, source, filePath, snapshotVersion) : undefined,
    condition: conditionNode ? normalize(conditionNode, source, filePath, snapshotVersion) : undefined,
    update: updateNode ? normalize(updateNode, source, filePath, snapshotVersion) : undefined,
    body: {
      ...base(bodyNode ?? node, 'Block', filePath, snapshotVersion),
      statements: bodyNode
        ? bodyNode.namedChildren.map((child) => normalize(child, source, filePath, snapshotVersion))
        : [],
    },
  };
}

export function normalizeReturn(
  node: SyntaxNode,
  source: string,
  filePath: string,
  snapshotVersion: string,
  normalize: NormalizeFn
): ReturnNode {
  const valueNode = node.childForFieldName?.('argument') ?? node.namedChildren[0];
  return {
    ...base(node, 'Return', filePath, snapshotVersion),
    value: valueNode ? normalize(valueNode, source, filePath, snapshotVersion) : undefined,
  };
}

export function normalizeExpressionStatement(
  node: SyntaxNode,
  source: string,
  filePath: string,
  snapshotVersion: string,
  normalize: NormalizeFn
): ExpressionStatementNode {
  const expressionNode = node.childForFieldName?.('expression') ?? node.namedChildren[0] ?? node;
  return {
    ...base(node, 'ExpressionStatement', filePath, snapshotVersion),
    expression: normalize(expressionNode, source, filePath, snapshotVersion),
  };
}

export function normalizeVariableDeclaration(
  node: SyntaxNode,
  source: string,
  filePath: string,
  snapshotVersion: string,
  normalize: NormalizeFn
): VariableNode | BlockNode {
  const kindText = node.text.trim().startsWith('const')
    ? 'const'
    : node.text.trim().startsWith('var')
      ? 'var'
      : 'let';

  const declarators = node.namedChildren.filter((child) => child.type === 'variable_declarator');
  const targets = declarators.length > 0 ? declarators : node.namedChildren;

  const variables = targets.map((decl) => {
    const nameNode =
      decl.childForFieldName?.('name') ??
      decl.namedChildren.find((child) => child.type === 'identifier');
    const initNode =
      decl.childForFieldName?.('value') ??
      decl.childForFieldName?.('initializer') ??
      decl.namedChildren[1];

    return {
      ...base(decl, 'Variable', filePath, snapshotVersion),
      name: nameNode ? nameNode.text : '',
      kind: kindText as VariableNode['kind'],
      initializer: initNode ? normalize(initNode, source, filePath, snapshotVersion) : undefined,
    };
  });

  if (variables.length === 1) {
    return variables[0];
  }

  return {
    ...base(node, 'Block', filePath, snapshotVersion),
    statements: variables.map((variable) => {
      const expr: ExpressionStatementNode = {
        ...base(node, 'ExpressionStatement', filePath, snapshotVersion),
        expression: variable,
      };
      return expr;
    }),
  };
}
