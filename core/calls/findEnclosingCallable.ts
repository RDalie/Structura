import type { NormalizedNode } from '../types/ast';

type NodeWithParent = NormalizedNode & { parentId?: string };

const CALLABLE_TYPES = new Set<string>(['Function']);

/**
 * Walk up the parent chain from a call node to find the nearest enclosing callable (function/method).
 * - Stops at the module root.
 * - Returns null if the parent chain is missing or no callable is found.
 */
export function findEnclosingCallable(
  callNode: NormalizedNode,
  nodeMap: Map<string, NormalizedNode>
): NormalizedNode | null {
  // Prefer the node instance from the map because it carries parentId.
  let current: NodeWithParent | undefined =
    (nodeMap.get(callNode.id) as NodeWithParent | undefined) ?? (callNode as NodeWithParent);

  while (current) {
    const parentId =
      current.parentId ?? (nodeMap.get(current.id) as NodeWithParent | undefined)?.parentId;
    if (!parentId) {
      return null;
    }

    const parent = nodeMap.get(parentId) as NodeWithParent | undefined;
    if (!parent) {
      return null;
    }

    if (CALLABLE_TYPES.has(parent.type)) {
      return parent;
    }

    if (parent.type === 'Module') {
      return null;
    }

    current = parent;
  }

  return null;
}
