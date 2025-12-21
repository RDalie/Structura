import { createHash } from 'node:crypto';
import type { Prisma } from '../../generated/prisma/client';
import type { NormalizedNode } from '@structura/core';

// Convert a normalized AST into flat rows for Prisma createMany.
export function flattenNodes(
  node: NormalizedNode,
  snapshotId: string,
  parentId?: string
): Prisma.AstNodeCreateManyInput[] {
  const childNodes: NormalizedNode[] = [];
  const data: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(node)) {
    if (isBaseField(key)) {
      continue;
    }

    if (isNormalizedNode(value)) {
      childNodes.push(value);
      data[`${key}Id`] = toUuid(value.id);
      continue;
    }

    if (Array.isArray(value)) {
      const arrayChildren: NormalizedNode[] = [];
      const serialized = (value as unknown[]).map((item): unknown => {
        if (isNormalizedNode(item)) {
          arrayChildren.push(item);
          return toUuid(item.id);
        }
        return item;
      });
      if (serialized.length > 0) {
        data[key] = serialized;
      }
      childNodes.push(...arrayChildren);
      continue;
    }

    data[key] = value as unknown;
  }

  const currentRow: Prisma.AstNodeCreateManyInput = {
    id: toUuid(node.id),
    filePath: node.filePath,
    type: node.type,
    parentId: parentId ? toUuid(parentId) : null,
    snapshotId,
    data: data as Prisma.InputJsonValue,
    location: (node.location as Prisma.InputJsonValue) ?? null,
    originalType: node.originalType ?? null,
  };

  return [currentRow, ...childNodes.flatMap((child) => flattenNodes(child, snapshotId, node.id))];
}

function isNormalizedNode(value: unknown): value is NormalizedNode {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.type === 'string' &&
    typeof candidate.filePath === 'string'
  );
}

function isBaseField(key: string) {
  return (
    key === 'id' ||
    key === 'type' ||
    key === 'filePath' ||
    key === 'location' ||
    key === 'originalType'
  );
}

function toUuid(input: string): string {
  const hex = createHash('sha256').update(input).digest('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(
    16,
    20
  )}-${hex.slice(20, 32)}`;
}
