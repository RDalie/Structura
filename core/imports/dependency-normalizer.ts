/**
 * Normalize a resolver snapshot into a canonical dependency graph representation.
 * - Nodes: unique files (importers and successfully resolved targets), sorted alphabetically.
 * - Edges: one per successful import (from importer to resolvedPath), deduplicated and sorted.
 * - Unresolved: original order of failed resolutions with importer/specifier/reason.
 */

export type ResolverSnapshot = {
  summary: {
    generatedAt: string;
    [key: string]: unknown;
  };
  entries: Array<{
    importer: string;
    specifier: string;
    resolution: {
      ok: boolean;
      resolvedPath?: string;
      reason?: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  }>;
};

export type NormalizedNode = { id: string; type: 'file' };
export type NormalizedEdge = { from: string; to: string; kind: 'import' };
export type NormalizedUnresolved = { importer: string; specifier: string; reason: string };

export type NormalizedGraph = {
  version: string;
  nodes: NormalizedNode[];
  edges: NormalizedEdge[];
  unresolved: NormalizedUnresolved[];
};

export function normalizeResolvedImports(snapshot: ResolverSnapshot): NormalizedGraph {
  validateSnapshot(snapshot);

  // Extract graph components in deterministic order so output is stable across runs.
  const nodes = collectNodes(snapshot.entries);
  const edges = collectEdges(snapshot.entries);
  const unresolved = collectUnresolved(snapshot.entries);

  return {
    version: snapshot.summary.generatedAt,
    nodes,
    edges,
    unresolved,
  };
}

function validateSnapshot(snapshot: ResolverSnapshot) {
  if (!snapshot || typeof snapshot !== 'object') {
    throw new Error('Invalid snapshot: expected object');
  }
  if (!snapshot.summary || typeof snapshot.summary.generatedAt !== 'string') {
    throw new Error('Invalid snapshot: summary.generatedAt is required');
  }
  if (!Array.isArray(snapshot.entries)) {
    throw new Error('Invalid snapshot: entries must be an array');
  }
}

function collectNodes(entries: ResolverSnapshot['entries']): NormalizedNode[] {
  const nodeIds = new Set<string>();

  // Capture all importers plus all successfully resolved targets.
  // This ensures the node list is a superset of every endpoint seen in the snapshot.
  for (const entry of entries) {
    if (entry.importer) {
      nodeIds.add(entry.importer);
    }
    if (entry.resolution?.ok && entry.resolution.resolvedPath) {
      nodeIds.add(entry.resolution.resolvedPath);
    }
  }

  return Array.from(nodeIds)
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
    .map((id) => ({ id, type: 'file' as const }));
}

function collectEdges(entries: ResolverSnapshot['entries']): NormalizedEdge[] {
  const seen = new Set<string>();
  const edges: NormalizedEdge[] = [];

  // One edge per successful import, deduplicated by from->to to avoid duplicates
  // when multiple identical imports appear across lines or files.
  for (const entry of entries) {
    const resolvedPath = entry.resolution?.resolvedPath;
    if (!entry.resolution?.ok || !resolvedPath) continue;

    const key = `${entry.importer}->${resolvedPath}`;
    if (seen.has(key)) continue;
    seen.add(key);
    edges.push({ from: entry.importer, to: resolvedPath, kind: 'import' });
  }

  return edges.sort((a, b) => {
    if (a.from === b.from) return a.to < b.to ? -1 : a.to > b.to ? 1 : 0;
    return a.from < b.from ? -1 : 1;
  });
}

function collectUnresolved(entries: ResolverSnapshot['entries']): NormalizedUnresolved[] {
  const unresolved: NormalizedUnresolved[] = [];

  // Preserve original order for unresolved entries for easier debugging.
  // Each item captures minimal context: who imported, what specifier, and why it failed.
  for (const entry of entries) {
    if (entry.resolution?.ok) continue;
    unresolved.push({
      importer: entry.importer,
      specifier: entry.specifier,
      reason: entry.resolution?.reason ?? 'UNKNOWN',
    });
  }

  return unresolved;
}
