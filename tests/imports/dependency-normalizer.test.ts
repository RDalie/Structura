import { describe, expect, it } from 'vitest';
import { normalizeResolvedImports } from '../../core/imports/dependency-normalizer';

describe('normalizeResolvedImports', () => {
  it('builds sorted, deduplicated nodes and edges while preserving unresolved order', () => {
    const snapshot = {
      summary: { generatedAt: '2025-01-01T00:00:00.000Z' },
      entries: [
        {
          importer: '/proj/src/a.ts',
          specifier: './b',
          resolution: { ok: true, resolvedPath: '/proj/src/b.ts' },
        },
        {
          importer: '/proj/src/a.ts',
          specifier: './b-again',
          resolution: { ok: true, resolvedPath: '/proj/src/b.ts' }, // duplicate edge, should be deduped
        },
        {
          importer: '/proj/src/c.ts',
          specifier: './a',
          resolution: { ok: true, resolvedPath: '/proj/src/a.ts' },
        },
        {
          importer: '/proj/src/d.ts',
          specifier: './missing',
          resolution: { ok: false, reason: 'FILE_NOT_FOUND' },
        },
        {
          importer: '/proj/src/e.ts',
          specifier: './unknown-reason',
          resolution: { ok: false }, // should default reason to UNKNOWN
        },
      ],
    };

    const result = normalizeResolvedImports(snapshot);

    expect(result.version).toBe('2025-01-01T00:00:00.000Z');
    // Nodes include all importers plus all resolved targets, deduped and sorted.
    expect(result.nodes).toEqual([
      { id: '/proj/src/a.ts', type: 'file' },
      { id: '/proj/src/b.ts', type: 'file' },
      { id: '/proj/src/c.ts', type: 'file' },
      { id: '/proj/src/d.ts', type: 'file' },
      { id: '/proj/src/e.ts', type: 'file' },
    ]);

    // Edges deduped and sorted by from then to.
    expect(result.edges).toEqual([
      { from: '/proj/src/a.ts', to: '/proj/src/b.ts', kind: 'import' },
      { from: '/proj/src/c.ts', to: '/proj/src/a.ts', kind: 'import' },
    ]);

    // Unresolved preserves order and reason handling.
    expect(result.unresolved).toEqual([
      { importer: '/proj/src/d.ts', specifier: './missing', reason: 'FILE_NOT_FOUND' },
      { importer: '/proj/src/e.ts', specifier: './unknown-reason', reason: 'UNKNOWN' },
    ]);
  });

  it('throws when snapshot is missing required fields', () => {
    expect(() =>
      normalizeResolvedImports({ summary: {}, entries: [] } as any)
    ).toThrow(/generatedAt/);
  });
});
