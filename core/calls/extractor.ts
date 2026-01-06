import {
  BlockNode,
  CallNode,
  ConditionalNode,
  ExpressionStatementNode,
  FunctionNode,
  IdentifierNode,
  LoopNode,
  ModuleNode,
  NormalizedNode,
  ReturnNode,
  VariableNode,
  MemberExpressionNode,
} from '../types/ast';
import { FileCalls } from './types';

// Walk a normalized Module and collect call nodes.
export function extractCallsFromModule(module: ModuleNode, _source: string): FileCalls {
  const calls: FileCalls['calls'] = [];
  const seen = new Set<string>();

  const addCall = (record: FileCalls['calls'][number]) => {
    const key = `${record.callee}:${record.line}:${record.raw}`;
    if (seen.has(key)) return;
    seen.add(key);
    calls.push(record);
  };

  const traverse = (node?: NormalizedNode) => {
    if (!node) return;

    if (node.type === 'Call') {
      const call = node as CallNode;
      addCall({
        callee: renderCallee(call.callee),
        line: (call.location?.startLine ?? 0) + 1,
        raw: call.raw ?? '',
      });
    }

    switch (node.type) {
      case 'Module':
        (node as ModuleNode).body.forEach(traverse);
        break;
      case 'Block':
        (node as BlockNode).statements.forEach(traverse);
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
        traverse((node as VariableNode).initializer);
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
        break;
      default:
        break;
    }
  };

  module.body.forEach(traverse);

  return { filePath: module.path, calls };
}

function renderCallee(node: NormalizedNode): string {
  if (node.type === 'Identifier') {
    return (node as IdentifierNode).name;
  }
  if (node.type === 'MemberExpression') {
    const access = node as MemberExpressionNode;
    const object = renderCallee(access.object as NormalizedNode);
    const prop = (access.property as IdentifierNode).name;
    return `${object}.${prop}`;
  }
  return node.type;
}
