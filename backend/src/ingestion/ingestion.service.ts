import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { assertDirectoryReadable } from './fs-guards';
import { IngestionPipelineService } from './ingestion-pipeline.service';
import { normalizeRootPath } from './ingestion-utils';
import { createSnapshot } from './snapshot';

@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pipeline: IngestionPipelineService
  ) {}

  async listSnapshots() {
    type SnapshotRow = {
      id: string;
      rootPath: string;
      snapshotVersion: string;
      silhouetteScore: number | null;
      createdAt: Date;
      astNodesCount: bigint;
      graphEdgesCount: bigint;
    };

    const rows = await this.prisma.$queryRaw<SnapshotRow[]>`
      SELECT
        s."id",
        s."rootPath",
        s."snapshotVersion",
        s."silhouetteScore",
        s."createdAt",
        COALESCE(an."astNodesCount", 0) AS "astNodesCount",
        COALESCE(ge."graphEdgesCount", 0) AS "graphEdgesCount"
      FROM "Snapshot" s
      LEFT JOIN (
        SELECT "snapshotId", COUNT(*) AS "astNodesCount"
        FROM "AstNode"
        GROUP BY "snapshotId"
      ) an
        ON an."snapshotId" = s."id"
      LEFT JOIN (
        SELECT "snapshotId", COUNT(*) AS "graphEdgesCount"
        FROM "GraphEdge"
        GROUP BY "snapshotId"
      ) ge
        ON ge."snapshotId" = s."id"
      ORDER BY s."createdAt" DESC
      LIMIT 25
    `;

    return rows.map((row) => ({
      id: row.id,
      rootPath: row.rootPath,
      snapshotVersion: row.snapshotVersion,
      silhouetteScore: row.silhouetteScore,
      createdAt: row.createdAt,
      _count: {
        astNodes: Number(row.astNodesCount),
        graphEdges: Number(row.graphEdgesCount),
      },
    }));
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
