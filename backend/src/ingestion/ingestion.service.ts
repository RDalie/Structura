import { Injectable, Logger } from '@nestjs/common';
import * as path from 'node:path';
import Parser from 'tree-sitter';
import JavaScript from 'tree-sitter-javascript';
import { crawlJsFiles } from '@structura/ingestion';
import type { Snapshot } from '../../generated/prisma/client';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { assertDirectoryReadable } from './fs-guards.js';
import { parseAndPersist } from './parse-and-persist.js';
import { createSnapshot } from './snapshot.js';

@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);
  private readonly parser: Parser;

  constructor(private readonly prisma: PrismaService) {
    this.parser = new Parser();
    // tree-sitter typings do not carry the language type information here.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
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

    void this.extractGraphEdges();

    return {
      snapshotId,
      message: `Ingestion started for ${normalizedRoot}`,
    };
  }

  // TODO: main graph extraction function that does all kinds of graph extractions
  private extractGraphEdges() {
    // TODO: Import graph extraction
  }

  private extractImportGraphEdges() {}

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
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Snapshot ${snapshotId}: ingestion pipeline failed for ${root}: ${message}`
      );
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
