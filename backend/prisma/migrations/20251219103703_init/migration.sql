-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AstNode" (
    "id" UUID NOT NULL,
    "filePath" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "parentId" UUID,
    "snapshotId" UUID NOT NULL,
    "data" JSONB NOT NULL,
    "location" JSONB,
    "originalType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AstNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GraphEdge" (
    "id" UUID NOT NULL,
    "fromId" UUID NOT NULL,
    "toId" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "snapshotId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GraphEdge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Snapshot" (
    "id" UUID NOT NULL,
    "snapshotVersion" TEXT NOT NULL,
    "rootPath" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "AstNode_type_idx" ON "AstNode"("type");

-- CreateIndex
CREATE INDEX "AstNode_filePath_idx" ON "AstNode"("filePath");

-- CreateIndex
CREATE INDEX "AstNode_parentId_idx" ON "AstNode"("parentId");

-- CreateIndex
CREATE INDEX "GraphEdge_fromId_idx" ON "GraphEdge"("fromId");

-- CreateIndex
CREATE INDEX "GraphEdge_toId_idx" ON "GraphEdge"("toId");

-- CreateIndex
CREATE INDEX "GraphEdge_kind_idx" ON "GraphEdge"("kind");

-- CreateIndex
CREATE INDEX "GraphEdge_filePath_idx" ON "GraphEdge"("filePath");

-- CreateIndex
CREATE INDEX "GraphEdge_snapshotId_idx" ON "GraphEdge"("snapshotId");

-- CreateIndex
CREATE INDEX "Snapshot_snapshotVersion_idx" ON "Snapshot"("snapshotVersion");

-- AddForeignKey
ALTER TABLE "AstNode" ADD CONSTRAINT "AstNode_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "AstNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AstNode" ADD CONSTRAINT "AstNode_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "Snapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GraphEdge" ADD CONSTRAINT "GraphEdge_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "Snapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
