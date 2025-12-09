import { SyntaxNode } from 'tree-sitter';
import {
  BaseNode,
  BlockNode,
  CallNode,
  ConditionalNode,
  ExpressionStatementNode,
  FunctionNode,
  IdentifierNode,
  ImportNode,
  LiteralNode,
  LoopNode,
  ModuleNode,
  NormalizedNode,
  ParameterNode,
  ReturnNode,
  VariableNode,
  UnknownNode,
} from '../types/ast';
import { makeDeterministicId } from './makeDeterministicId';

export function normalize(node: SyntaxNode, source: string, filePath = ''): NormalizedNode {
  switch (node.type) {
    case 'program':
      return normalizeProgram(node, source, filePath);
    case 'parenthesized_expression':
      return normalize(node.namedChildren[0] ?? node, source, filePath);
    case 'identifier':
      return normalizeIdentifier(node, source, filePath);
    case 'number':
    case 'string':
    case 'true':
    case 'false':
    case 'null':
      return normalizeLiteral(node, source, filePath);
    case 'call_expression':
      return normalizeCall(node, source, filePath);
    case 'function_declaration':
    case 'function':
    case 'arrow_function':
      return normalizeFunction(node, source, filePath);
    case 'if_statement':
      return normalizeConditional(node, source, filePath);
    case 'for_statement':
    case 'while_statement':
    case 'do_statement':
    case 'for_in_statement':
    case 'for_of_statement':
      return normalizeLoop(node, source, filePath);
    case 'return_statement':
      return normalizeReturn(node, source, filePath);
    case 'expression_statement':
      return normalizeExpressionStatement(node, source, filePath);
    case 'lexical_declaration':
      return normalizeVariableDeclaration(node, source, filePath);
    case 'import_statement':
      return normalizeImport(node, source, filePath);
    default:
      return normalizeUnknown(node, source, filePath);
  }
}

function normalizeProgram(node: SyntaxNode, source: string, filePath: string): ModuleNode {
  const body = node.namedChildren.map((child) => normalize(child, source, filePath));
  return {
    ...base(node, 'Module', filePath),
    path: filePath,
    body,
  };
}

function normalizeIdentifier(node: SyntaxNode, _source: string, _filePath: string): IdentifierNode {
  return {
    ...base(node, 'Identifier', _filePath),
    name: node.text,
  };
}

function normalizeLiteral(node: SyntaxNode, _source: string, _filePath: string): LiteralNode {
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
    ...base(node, 'Literal', _filePath),
    value,
    literalType,
  };
}

function normalizeCall(node: SyntaxNode, source: string, filePath: string): CallNode {
  const calleeNode = node.childForFieldName?.('function') ?? node.namedChildren[0] ?? node;
  const argsNode =
    node.childForFieldName?.('arguments') ??
    node.namedChildren.find((child) => child.type === 'arguments');
  const args = argsNode
    ? argsNode.namedChildren.map((child) => normalize(child, source, filePath))
    : [];

  return {
    ...base(node, 'Call', filePath),
    callee: normalize(calleeNode, source, filePath),
    args,
    raw: source.slice(node.startIndex, node.endIndex),
  };
}

function normalizeFunction(node: SyntaxNode, source: string, filePath: string): FunctionNode {
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
        ...base(param, 'Parameter', filePath),
        name: param.text,
        paramType: undefined,
      }))
    : [];

  const bodyStatements = bodyNode
    ? bodyNode.namedChildren.map((child) => normalize(child, source, filePath))
    : [];
  const body: BlockNode = {
    ...base(bodyNode ?? node, 'Block', filePath),
    statements: bodyStatements,
  };

  return {
    ...base(node, 'Function', filePath),
    name: nameNode ? nameNode.text : undefined,
    params,
    returnType: undefined,
    body,
  };
}

function normalizeConditional(node: SyntaxNode, source: string, filePath: string): ConditionalNode {
  const conditionNode = node.childForFieldName?.('condition') ?? node.namedChildren[0] ?? node;
  const consequenceNode = node.childForFieldName?.('consequence') ?? node.namedChildren[1];
  const alternativeNode = node.childForFieldName?.('alternative') ?? node.namedChildren[2];

  const thenBlock: BlockNode = {
    ...base(consequenceNode ?? node, 'Block', filePath),
    statements: consequenceNode
      ? consequenceNode.namedChildren.map((child) => normalize(child, source, filePath))
      : [],
  };

  const elseBlock =
    alternativeNode !== undefined
      ? {
          ...base(alternativeNode, 'Block', filePath),
          statements: alternativeNode.namedChildren.map((child) =>
            normalize(child, source, filePath)
          ),
        }
      : undefined;

  return {
    ...base(node, 'Conditional', filePath),
    condition: normalize(conditionNode, source, filePath),
    then: thenBlock,
    else: elseBlock,
  };
}

function normalizeLoop(node: SyntaxNode, source: string, filePath: string): LoopNode {
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
    ...base(node, 'Loop', filePath),
    loopType,
    init: initNode ? normalize(initNode, source, filePath) : undefined,
    condition: conditionNode ? normalize(conditionNode, source, filePath) : undefined,
    update: updateNode ? normalize(updateNode, source, filePath) : undefined,
    body: {
      ...base(bodyNode ?? node, 'Block', filePath),
      statements: bodyNode
        ? bodyNode.namedChildren.map((child) => normalize(child, source, filePath))
        : [],
    },
  };
}

function normalizeReturn(node: SyntaxNode, source: string, filePath: string): ReturnNode {
  const valueNode = node.childForFieldName?.('argument') ?? node.namedChildren[0];
  return {
    ...base(node, 'Return', filePath),
    value: valueNode ? normalize(valueNode, source, filePath) : undefined,
  };
}

function normalizeExpressionStatement(
  node: SyntaxNode,
  source: string,
  filePath: string
): ExpressionStatementNode {
  const expressionNode = node.childForFieldName?.('expression') ?? node.namedChildren[0] ?? node;
  return {
    ...base(node, 'ExpressionStatement', filePath),
    expression: normalize(expressionNode, source, filePath),
  };
}

function normalizeVariableDeclaration(
  node: SyntaxNode,
  source: string,
  filePath: string
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
      ...base(decl, 'Variable', filePath),
      name: nameNode ? nameNode.text : '',
      kind: kindText as VariableNode['kind'],
      initializer: initNode ? normalize(initNode, source, filePath) : undefined,
    };
  });

  if (variables.length === 1) {
    return variables[0];
  }

  return {
    ...base(node, 'Block', filePath),
    statements: variables.map((variable) => {
      const expr: ExpressionStatementNode = {
        ...base(node, 'ExpressionStatement', filePath),
        expression: variable,
      };
      return expr;
    }),
  };
}

function normalizeImport(node: SyntaxNode, _source: string, _filePath: string): ImportNode {
  const importClause = node.namedChildren.find((child) => child.type === 'import_clause');
  const moduleSpecifierNode =
    node.childForFieldName?.('source') ??
    node.namedChildren.find((child) => child.type === 'string');

  const importedNames: string[] = [];

  if (importClause) {
    // Imported names reflect local bindings (default, namespace alias, or named/aliased imports).
    importClause.namedChildren.forEach((child) => {
      if (child.type === 'identifier') {
        // Default import
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
    ...base(node, 'Import', _filePath),
    module: moduleSpecifierNode
      ? moduleSpecifierNode.text.replace(/^['"`]/, '').replace(/['"`]$/, '')
      : '',
    imported: importedNames,
    raw: _source.slice(node.startIndex, node.endIndex),
  };
}

function normalizeUnknown(
  node: SyntaxNode,
  source: string,
  filePath: string,
  logger: Pick<Console, 'warn'> = console
): UnknownNode {
  logger.warn(
    `[Structura Warning] Unknown Tree Sitter node type "${node.type}" encountered in file ${filePath} at line ${
      node.startPosition.row + 1
    }`
  );

  return {
    id: makeDeterministicId(node, filePath),
    type: 'Unknown',
    raw: source.slice(node.startIndex, node.endIndex),
    originalType: node.type,
    location: toLocation(node),
  };
}

function base<T extends BaseNode['type']>(
  node: SyntaxNode,
  type: T,
  filePath: string
): BaseNode & { type: T } {
  return {
    id: makeDeterministicId(node, filePath),
    type,
    location: toLocation(node),
    originalType: node.type,
  };
}

function toLocation(node: SyntaxNode) {
  return {
    startLine: node.startPosition.row,
    startCol: node.startPosition.column,
    endLine: node.endPosition.row,
    endCol: node.endPosition.column,
  };
}
