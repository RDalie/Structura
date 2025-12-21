/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import Parser from 'tree-sitter';
import JavaScript from 'tree-sitter-javascript';
import { crawlJsFiles } from '@structura/ingestion';
import { buildSnapshotFileMap } from '@structura/ingestion/snapshots/buildSnapshotFileMap.js';
import { extractImportsFromModule } from '@structura/core/imports/extractor';
import { resolveImport } from '@structura/core/imports/import-resolver';
import type { ModuleNode } from '@structura/core';
import type { Snapshot } from '../../generated/prisma/client';
import { EdgeKind } from '../graph/graph.types';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { GraphEdgesService, type CreateGraphEdgeInput } from '../graph-edges/graph-edges.service';
import { assertDirectoryReadable } from './fs-guards';
import { parseAndPersist } from './parse-and-persist';
import { createSnapshot } from './snapshot';
import { normalizeAst } from './normalize-ast';

@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);
  private readonly parser: Parser;

  constructor(
    private readonly prisma: PrismaService,
    private readonly graphEdgesService: GraphEdgesService
  ) {
    this.parser = new Parser();
    // tree-sitter typings do not carry the language type information here.

    this.parser.setLanguage(JavaScript as any);
  }

  async listSnapshots() {
    return this.prisma.snapshot.findMany({
      orderBy: { createdAt: 'desc' },
      take: 25,
      select: {
        id: true,
        rootPath: true,
        snapshotVersion: true,
        createdAt: true,
        _count: {
          select: {
            astNodes: true,
            graphEdges: true,
          },
        },
      },
    });
  }

  async start(rootPath: string) {
    const normalizedRoot = normalizeRootPath(rootPath);
    await assertDirectoryReadable(normalizedRoot);

    const snapshot = await createSnapshot(this.prisma, normalizedRoot);
    const snapshotId = snapshot.id;
    this.logger.log(`Starting ingestion for ${normalizedRoot} (snapshot ${snapshotId})`);

    // Kick off parsing asynchronously so the request returns immediately.
    void this.runParsing(normalizedRoot, snapshot);

    return {
      snapshotId,
      message: `Ingestion started for ${normalizedRoot}`,
    };
  }

  private async runParsing(root: string, snapshot: Snapshot) {
    const snapshotId = snapshot.id;
    try {
      const files = await crawlJsFiles(root);
      this.logger.log(
        `Snapshot ${snapshotId}: discovered ${files.length} JS/TS files under ${root}`
      );

      const outcome = await parseAndPersist({
        files,
        parser: this.parser,
        snapshot,
        prisma: this.prisma,
        logger: this.logger,
      });

      this.logger.log(
        `Snapshot ${snapshotId}: parsed ${outcome.parsed}/${outcome.total} files, normalized ${outcome.normalized}, failures: ${outcome.failed}`
      );

      await this.extractImportGraphEdges(snapshot, files);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Snapshot ${snapshotId}: ingestion pipeline failed for ${root}: ${message}`
      );
    }
  }

  private async extractImportGraphEdges(snapshot: Snapshot, files: string[]) {
    if (!files.length) {
      return;
    }

    const snapshotId = snapshot.id;
    const normalizedModules = new Map<string, ModuleNode>();
    const sources = new Map<string, string>();

    try {
      const { fileMap } = buildSnapshotFileMap(snapshot.rootPath, files);
      const snapshotFiles = new Set<string>();
      for (const absolute of fileMap.values()) {
        snapshotFiles.add(toPosix(absolute));
      }

      // Parse and normalize again so we can reuse the normalized Module for import extraction.
      for (const file of files) {
        try {
          const source = await fs.readFile(file, 'utf8');
          const tree = this.parser.parse(source);
          if (tree.rootNode.hasError) {
            this.logger.warn(
              `Snapshot ${snapshotId}: skipping import extraction for ${file} due to parse errors`
            );
            continue;
          }

          const normalized = normalizeAst(tree, source, file, snapshot.id, this.logger);
          if (!normalized || normalized.type !== 'Module') {
            this.logger.warn(
              `Snapshot ${snapshotId}: skipping import extraction for ${file} (unexpected root type ${normalized?.type ?? 'unknown'})`
            );
            continue;
          }

          normalizedModules.set(toPosix(file), normalized);
          sources.set(toPosix(file), source);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          this.logger.warn(
            `Snapshot ${snapshotId}: failed import extraction prep for ${file}: ${message}`
          );
        }
      }

      if (!normalizedModules.size) {
        this.logger.log(
          `Snapshot ${snapshotId}: no normalized modules available for import graph extraction`
        );
        return;
      }

      const rootIds = new Map<string, string>();
      for (const [filePath, module] of normalizedModules.entries()) {
        rootIds.set(filePath, toUuid(module.id));
      }

      const edges: CreateGraphEdgeInput[] = [];
      const seen = new Set<string>();

      for (const [filePath, module] of normalizedModules.entries()) {
        const source = sources.get(filePath) ?? '';
        const fromId = rootIds.get(filePath);
        if (!fromId) continue;

        const extracted = extractImportsFromModule(module, source);
        for (const record of extracted.imports) {
          const resolution = resolveImport(filePath, record.module);
          if (!resolution.ok || !resolution.resolvedPath) continue;

          const targetPath = toPosix(resolution.resolvedPath);
          if (!snapshotFiles.has(targetPath)) continue;

          const toId = rootIds.get(targetPath);
          if (!toId) continue;

          const key = `${snapshotId}:${fromId}:${toId}:${EdgeKind.Import}`;
          if (seen.has(key)) continue;
          seen.add(key);

          edges.push({
            fromId,
            toId,
            kind: EdgeKind.Import,
            filePath: filePath,
            snapshotId,
            version: 1,
          });
        }
      }

      if (!edges.length) {
        this.logger.log(`Snapshot ${snapshotId}: no resolved imports to persist as graph edges`);
        return;
      }

      await this.prisma.graphEdge.deleteMany({
        where: { snapshotId, kind: EdgeKind.Import },
      });

      await this.graphEdgesService.createGraphEdges(edges);
      this.logger.log(`Snapshot ${snapshotId}: persisted ${edges.length} import graph edges`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Snapshot ${snapshotId}: import graph extraction failed: ${message}`);
    }
  }
}

function normalizeRootPath(input: string) {
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

function toPosix(input: string) {
  return input.replace(/\\/g, '/');
}

function toUuid(input: string): string {
  const hex = createHash('sha256').update(input).digest('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(
    16,
    20
  )}-${hex.slice(20, 32)}`;
}
