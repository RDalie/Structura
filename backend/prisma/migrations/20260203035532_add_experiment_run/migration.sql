-- CreateTable
CREATE TABLE "ExperimentRun" (
    "id" UUID NOT NULL,
    "snapshotId" UUID NOT NULL,
    "numLayers" INTEGER NOT NULL DEFAULT 2,
    "hiddenChannels" INTEGER NOT NULL DEFAULT 128,
    "seed" INTEGER NOT NULL DEFAULT 42,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "errorMessage" TEXT,
    "tensorBundlePath" TEXT,
    "embeddingsPath" TEXT,
    "tsnePlotPath" TEXT,
    "nodeCount" INTEGER,
    "edgeCount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ExperimentRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExperimentRun_snapshotId_idx" ON "ExperimentRun"("snapshotId");

-- CreateIndex
CREATE INDEX "ExperimentRun_status_idx" ON "ExperimentRun"("status");

-- AddForeignKey
ALTER TABLE "ExperimentRun" ADD CONSTRAINT "ExperimentRun_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "Snapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
