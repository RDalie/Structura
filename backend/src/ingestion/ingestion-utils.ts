import { createHash } from 'node:crypto';
import * as path from 'node:path';
import type { ModuleNode, NormalizedNode } from '@structura/core';

export type NormalizedModulesContext = {
  snapshotId: string;
  normalizedModules: Map<string, ModuleNode>;
  sources: Map<string, string>;
  rootIds: Map<string, string>;
  snapshotFiles: Set<string>;
  // Maps absolute POSIX file paths to snapshot-relative paths (using buildSnapshotFileMap).
  relativePaths: Map<string, string>;
};

export function normalizeRootPath(input: string) {
  let candidate = input.trim();

  // Expand bare "~/…" to the user's home directory.
  if (candidate.startsWith('~')) {
    const home = process.env.HOME ?? '';
    candidate = path.join(home, candidate.slice(1));
  }

  // If a macOS-style path was provided without a leading slash, add it.
  if (/^Users[\\/]/.test(candidate)) {
    candidate = `${path.sep}${candidate}`;
  }

  return path.resolve(candidate);
}

export function toPosix(input: string) {
  return input.replace(/\\/g, '/');
}

export function toUuid(input: string): string {
  const hex = createHash('sha256').update(input).digest('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(
    16,
    20
  )}-${hex.slice(20, 32)}`;
}

type NodeWithParent = NormalizedNode & { parentId?: string };

export function buildNodeMapWithParents(module: ModuleNode) {
  const map = new Map<string, NodeWithParent>();

  const addNode = (node: NormalizedNode, parentId?: string) => {
    const current = { ...node, parentId } as NodeWithParent;
    map.set(node.id, current);
    return current;
  };

  const traverse = (node?: NormalizedNode, parentId?: string) => {
    if (!node) return;
    const current = addNode(node, parentId);

    switch (node.type) {
      case 'Module':
        node.body.forEach((child) => traverse(child, current.id));
        break;
      case 'Block':
        node.statements.forEach((child) => traverse(child, current.id));
        break;
      case 'ExpressionStatement': {
        const expression = (node as { expression?: NormalizedNode }).expression;
        traverse(expression, current.id);
        break;
      }
      case 'Function':
        traverse(node.body, current.id);
        break;
      case 'Call': {
        const callNode = node as { callee?: NormalizedNode; args: NormalizedNode[] };
        traverse(callNode.callee, current.id);
        callNode.args.forEach((arg) => traverse(arg, current.id));
        break;
      }
      case 'Variable': {
        const initializer = (node as { initializer?: NormalizedNode }).initializer;
        traverse(initializer, current.id);
        break;
      }
      case 'Return':
        traverse(node.value, current.id);
        break;
      case 'Conditional':
        traverse(node.condition, current.id);
        traverse(node.then, current.id);
        if (node.else) {
          traverse(node.else as NormalizedNode, current.id);
        }
        break;
      case 'Loop': {
        const loopNode = node as {
          init?: NormalizedNode;
          condition?: NormalizedNode;
          update?: NormalizedNode;
          body?: NormalizedNode;
        };
        traverse(loopNode.init, current.id);
        traverse(loopNode.condition, current.id);
        traverse(loopNode.update, current.id);
        traverse(loopNode.body, current.id);
        break;
      }
      default:
        break;
    }
  };

  traverse(module);
  return map;
}
