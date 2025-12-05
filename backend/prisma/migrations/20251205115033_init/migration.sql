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
    "childIds" UUID[],
    "data" JSONB NOT NULL,
    "location" JSONB,
    "originalType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AstNode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "AstNode_type_idx" ON "AstNode"("type");

-- CreateIndex
CREATE INDEX "AstNode_filePath_idx" ON "AstNode"("filePath");

-- CreateIndex
CREATE INDEX "AstNode_parentId_idx" ON "AstNode"("parentId");

-- AddForeignKey
ALTER TABLE "AstNode" ADD CONSTRAINT "AstNode_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "AstNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
