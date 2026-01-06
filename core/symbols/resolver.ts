import type {
  BlockNode,
  FunctionNode,
  IdentifierNode,
  ModuleNode,
  NormalizedNode,
  ParameterNode,
  VariableNode,
} from '../types/ast';

export type SymbolEdgeKind = 'ResolvesTo' | 'Declares';

export type SymbolEdge = {
  fromId: string;
  toId: string;
  kind: SymbolEdgeKind;
  filePath: string;
  snapshotId: string;
  version: number;
};

export type SymbolResolutionResult = {
  edges: SymbolEdge[];
};

type ScopeOwner = 'Module' | 'Function' | 'Block';
type DeclarationNode = VariableNode | FunctionNode | ParameterNode;

type Scope = {
  ownerId: string;
  ownerType: ScopeOwner;
  bindings: Map<string, DeclarationNode>;
};

/**
 * Resolve identifier usages to their nearest in-scope declarations within a single module.
 * Scopes: Module > Function > Block. Variable declarations register in the closest applicable
 * scope (function/module for `var`, current scope for `let`/`const`).
 */
export function resolveSymbols(params: {
  module: ModuleNode;
  snapshotId: string;
  version?: number;
}): SymbolResolutionResult {
  const { module, snapshotId, version = 1 } = params;

  const edges: SymbolEdge[] = [];
  const seen = new Set<string>();
  const scopes: Scope[] = [];

  const currentScope = () => scopes[scopes.length - 1];

  const addEdge = (edge: SymbolEdge) => {
    const key = `${edge.kind}:${edge.fromId}:${edge.toId}`;
    if (seen.has(key)) return;
    seen.add(key);
    edges.push(edge);
  };

  const pushScope = (ownerId: string, ownerType: ScopeOwner) => {
    scopes.push({ ownerId, ownerType, bindings: new Map() });
  };

  const popScope = () => {
    scopes.pop();
  };

  const findNearestScope = (ownerTypes: ScopeOwner[]): Scope | undefined => {
    for (let i = scopes.length - 1; i >= 0; i--) {
      const scope = scopes[i];
      if (ownerTypes.includes(scope.ownerType)) {
        return scope;
      }
    }
    return undefined;
  };

  const declareSymbol = (name: string | undefined, node: DeclarationNode, scope?: Scope) => {
    if (!name) return;
    const targetScope = scope ?? currentScope();
    if (!targetScope) return;
    if (targetScope.bindings.has(name)) return;

    targetScope.bindings.set(name, node);
    addEdge({
      kind: 'Declares',
      fromId: targetScope.ownerId,
      toId: node.id,
      filePath: node.filePath,
      snapshotId,
      version,
    });
  };

  const declareVariable = (node: VariableNode) => {
    // `var` is function-scoped; `let`/`const` are block-scoped.
    const targetScope =
      node.kind === 'var' ? findNearestScope(['Function', 'Module']) ?? currentScope() : currentScope();
    declareSymbol(node.name, node, targetScope);
  };

  const resolveIdentifier = (node: IdentifierNode) => {
    const binding = findBinding(node.name);
    if (!binding) return;

    addEdge({
      kind: 'ResolvesTo',
      fromId: node.id,
      toId: binding.id,
      filePath: node.filePath,
      snapshotId,
      version,
    });
  };

  const findBinding = (name: string): DeclarationNode | undefined => {
    for (let i = scopes.length - 1; i >= 0; i--) {
      const scope = scopes[i];
      const binding = scope.bindings.get(name);
      if (binding) return binding;
    }
    return undefined;
  };

  const traverseBlock = (block: BlockNode, createScope: boolean) => {
    if (createScope) {
      pushScope(block.id, 'Block');
    }

    block.statements.forEach(traverse);

    if (createScope) {
      popScope();
    }
  };

  const traverse = (node?: NormalizedNode) => {
    if (!node) return;

    switch (node.type) {
      case 'Module': {
        pushScope(node.id, 'Module');
        node.body.forEach(traverse);
        popScope();
        break;
      }
      case 'Block': {
        traverseBlock(node, true);
        break;
      }
      case 'Function': {
        // Declare in the parent scope first so siblings can reference this function.
        const parentScope = currentScope();
        if (node.name && parentScope) {
          declareSymbol(node.name, node, parentScope);
        }

        pushScope(node.id, 'Function');

        // Function name is also visible inside its own scope.
        if (node.name) {
          declareSymbol(node.name, node);
        }

        node.params.forEach((param) => declareSymbol(param.name, param));

        // Traverse the function body statements without creating an extra scope layer.
        traverseBlock(node.body, false);
        popScope();
        break;
      }
      case 'Variable': {
        declareVariable(node);
        traverse(node.initializer);
        break;
      }
      case 'Identifier': {
        resolveIdentifier(node);
        break;
      }
      case 'Call': {
        traverse(node.callee);
        node.args.forEach(traverse);
        break;
      }
      case 'ExpressionStatement': {
        traverse(node.expression);
        break;
      }
      case 'Return': {
        traverse(node.value);
        break;
      }
      case 'Conditional': {
        traverse(node.condition);
        traverseBlock(node.then, true);
        if (node.else) {
          traverseBlock(node.else, true);
        }
        break;
      }
      case 'Loop': {
        traverse(node.init);
        traverse(node.condition);
        traverse(node.update);
        traverseBlock(node.body, true);
        break;
      }
      case 'MemberExpression': {
        traverse(node.object);
        break;
      }
      case 'BinaryOp': {
        traverse(node.left);
        traverse(node.right);
        break;
      }
      case 'UnaryOp': {
        traverse(node.arg);
        break;
      }
      default:
        break;
    }
  };

  traverse(module);

  return { edges };
}
