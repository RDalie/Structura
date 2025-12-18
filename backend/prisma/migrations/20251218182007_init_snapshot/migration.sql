/*
  Warnings:

  - You are about to drop the column `childIds` on the `AstNode` table. All the data in the column will be lost.
  - Added the required column `snapshotId` to the `AstNode` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "AstNode" DROP COLUMN "childIds",
ADD COLUMN     "snapshotId" UUID NOT NULL;

-- CreateTable
CREATE TABLE "Snapshot" (
    "id" UUID NOT NULL,
    "snapshotVersion" TEXT NOT NULL,
    "rootPath" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Snapshot_snapshotVersion_idx" ON "Snapshot"("snapshotVersion");

-- AddForeignKey
ALTER TABLE "AstNode" ADD CONSTRAINT "AstNode_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "Snapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
