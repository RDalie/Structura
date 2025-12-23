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
import { findEnclosingCallable } from './findEnclosingCallable';

/**
 * Directed edge connecting a caller to its callee within a snapshot.
 * - `fromId` is the enclosing callable that issues the call.
 * - `toId` is the callee's node id (typically a function or method).
 * - `filePath` is the source file where the call expression lives.
 * - `snapshotId`/`version` scope the edge to a particular ingest run.
 */
export type CallEdge = {
  fromId: string;
  toId: string;
  kind: 'Call';
  filePath: string;
  snapshotId: string;
  version: number;
};

type NodeWithParent = NormalizedNode & { parentId?: string };

/**
 * Builds in-memory call edges for a single module without persistence.
 *
 * Process:
 * 1) DFS the module to collect every `Call` node while traversing the full tree.
 * 2) For each call, find its callee id and nearest enclosing callable via `nodeMap`.
 * 3) Emit a CallEdge for the caller→callee pair, deduping duplicates in the same module.
 */
export function buildCallEdges(params: {
  module: ModuleNode;
  nodeMap: Map<string, NormalizedNode>;
  snapshotId: string;
  version?: number;
}): CallEdge[] {
  const { module, nodeMap, snapshotId, version = 1 } = params;
  // Collect all Call nodes encountered during traversal.
  const callNodes: CallNode[] = [];

  // DFS traversal over the normalized AST to visit every child node.
  const traverse = (node?: NormalizedNode) => {
    if (!node) return;

    if (node.type === 'Call') {
      callNodes.push(node as CallNode);
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

  // Convert collected calls into unique call edges.
  const edges: CallEdge[] = [];
  const dedupe = new Set<string>();

  for (const call of callNodes) {
    const calleeId = (call.callee as NodeWithParent | undefined)?.id;
    if (!calleeId) {
      continue;
    }

    const enclosing = findEnclosingCallable(call, nodeMap);
    if (!enclosing) {
      continue;
    }

    const fromId = enclosing.id;
    const key = `${fromId}:${calleeId}:Call`;
    if (dedupe.has(key)) {
      continue;
    }
    dedupe.add(key);

    edges.push({
      fromId,
      toId: calleeId,
      kind: 'Call',
      filePath: call.filePath,
      snapshotId,
      version,
    });
  }

  return edges;
}
