import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'node:fs/promises';
import Parser from 'tree-sitter';
import { buildSnapshotFileMap } from '@structura/ingestion/snapshots/buildSnapshotFileMap.js';
import type { ModuleNode } from '@structura/core';
import type { Snapshot } from '../../generated/prisma/client';
import { normalizeAst } from './normalize-ast';
import { toPosix, toUuid, type NormalizedModulesContext } from './ingestion-utils';

@Injectable()
export class NormalizedModulesBuilderService {
  private readonly logger = new Logger(NormalizedModulesBuilderService.name);

  async build(
    snapshot: Snapshot,
    files: string[],
    parser: Parser
  ): Promise<NormalizedModulesContext | null> {
    const snapshotId = snapshot.id;
    const normalizedModules = new Map<string, ModuleNode>();
    const sources = new Map<string, string>();

    const { fileMap } = buildSnapshotFileMap(snapshot.rootPath, files);
    const snapshotFiles = new Set<string>();
    for (const absolute of fileMap.values()) {
      snapshotFiles.add(toPosix(absolute));
    }

    for (const file of files) {
      try {
        const source = await fs.readFile(file, 'utf8');
        const tree = parser.parse(source);
        if (tree.rootNode.hasError) {
          this.logger.warn(
            `Snapshot ${snapshotId}: skipping graph extraction for ${file} due to parse errors`
          );
          continue;
        }

        const posixFile = toPosix(file);
        const normalized = normalizeAst(tree, source, posixFile, snapshot.id, this.logger);
        if (!normalized || normalized.type !== 'Module') {
          this.logger.warn(
            `Snapshot ${snapshotId}: skipping graph extraction for ${file} (unexpected root type ${normalized?.type ?? 'unknown'})`
          );
          continue;
        }

        normalizedModules.set(posixFile, normalized);
        sources.set(posixFile, source);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `Snapshot ${snapshotId}: failed graph extraction prep for ${file}: ${message}`
        );
      }
    }

    if (!normalizedModules.size) {
      this.logger.log(
        `Snapshot ${snapshotId}: no normalized modules available for graph extraction`
      );
      return null;
    }

    const rootIds = new Map<string, string>();
    for (const [filePath, module] of normalizedModules.entries()) {
      rootIds.set(filePath, toUuid(module.id));
    }

    this.logger.log(
      `Snapshot ${snapshotId}: prepared ${normalizedModules.size} modules for graph extraction`
    );

    return {
      snapshotId,
      normalizedModules,
      sources,
      rootIds,
      snapshotFiles,
    };
  }
}
