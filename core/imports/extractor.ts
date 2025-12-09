import {
  BlockNode,
  CallNode,
  ConditionalNode,
  ExpressionStatementNode,
  FunctionNode,
  LoopNode,
  ModuleNode,
  NormalizedNode,
  ReturnNode,
  VariableNode,
} from '../types/ast';
import { FileImport } from './types';
import { handleEsImport } from './es-import';
import { handleRequireCall, handleRequireVariable } from './commonjs';

// Walk a normalized Module and collect both ES6 imports and CommonJS require()s.
export function extractImportsFromModule(module: ModuleNode, source: string): FileImport {
  const imports: FileImport['imports'] = [];
  const seen = new Set<string>();

  const addImport = (record: FileImport['imports'][number]) => {
    const key = `${record.kind}:${record.module}:${record.line}:${record.raw}`;
    if (seen.has(key)) return;
    seen.add(key);
    imports.push(record);
  };

  // Depth-first traversal over the normalized AST, extracting imports along the way.
  const traverse = (node?: NormalizedNode) => {
    if (!node) return;

    // Capture explicit ES6 import statements.
    if (node.type === 'Import') {
      handleEsImport(node, source, addImport);
    }

    // Detect CommonJS require calls (callee === require, first arg is string literal).
    if (node.type === 'Call') {
      const handled = handleRequireCall(node as CallNode, source, addImport);
      if (handled) return;
    }

    // Descend into child nodes based on node shape.
    switch (node.type) {
      case 'Module':
        node.body.forEach(traverse);
        break;
      case 'Block':
        node.statements.forEach(traverse);
        break;
      case 'ExpressionStatement':
        traverse((node as ExpressionStatementNode).expression);
        break;
      case 'Function':
        traverse((node as FunctionNode).body);
        break;
      case 'Call':
        traverse((node as CallNode).callee);
        (node as CallNode).args.forEach(traverse);
        break;
      case 'Variable':
        if (!handleRequireVariable(node as VariableNode, source, addImport)) {
          traverse((node as VariableNode).initializer);
        }
        break;
      case 'Return':
        traverse((node as ReturnNode).value);
        break;
      case 'Conditional':
        traverse((node as ConditionalNode).condition);
        traverse((node as ConditionalNode).then);
        if ((node as ConditionalNode).else) {
          traverse((node as ConditionalNode).else);
        }
        break;
      case 'Loop':
        traverse((node as LoopNode).init);
        traverse((node as LoopNode).condition);
        traverse((node as LoopNode).update);
        traverse((node as LoopNode).body as BlockNode | undefined);
        break;
      case 'Import':
      case 'Identifier':
      case 'Literal':
      case 'Unknown':
        // Leaf nodes; nothing further to traverse.
        break;
      default:
        break;
    }
  };

  module.body.forEach(traverse);

  return {
    filePath: module.path,
    imports,
  };
}
