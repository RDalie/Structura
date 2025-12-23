import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { assertDirectoryReadable } from './fs-guards';
import { IngestionPipelineService } from './ingestion-pipeline.service';
import { normalizeRootPath } from './ingestion-utils';
import { createSnapshot } from './snapshot';

@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);

  constructor(private readonly prisma: PrismaService, private readonly pipeline: IngestionPipelineService) {}

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

  // creates a snapshot and kicks off parsing
  async start(rootPath: string) {
    const normalizedRoot = normalizeRootPath(rootPath);
    await assertDirectoryReadable(normalizedRoot);

    const snapshot = await createSnapshot(this.prisma, normalizedRoot);
    const snapshotId = snapshot.id;
    this.logger.log(`Starting ingestion for ${normalizedRoot} (snapshot ${snapshotId})`);

    // Kick off parsing asynchronously so the request returns immediately.
    void this.pipeline.run(normalizedRoot, snapshot);

    return {
      snapshotId,
      message: `Ingestion started for ${normalizedRoot}`,
    };
  }
}
