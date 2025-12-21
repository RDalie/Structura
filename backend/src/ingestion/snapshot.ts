import { randomUUID } from 'node:crypto';
import { SNAPSHOT_VERSION } from '@structura/core';
import type { Snapshot } from '../../generated/prisma/client';
import { PrismaService } from '../infrastructure/prisma/prisma.service';

export async function createSnapshot(prisma: PrismaService, rootPath: string): Promise<Snapshot> {
  return prisma.snapshot.create({
    data: {
      id: randomUUID(),
      snapshotVersion: SNAPSHOT_VERSION,
      rootPath,
    },
  });
}
