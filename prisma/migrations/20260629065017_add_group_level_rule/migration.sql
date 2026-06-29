-- CreateTable
CREATE TABLE "group_level_rule" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "levelId" TEXT NOT NULL,
    "timeLimitSeconds" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "group_level_rule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "group_level_rule_groupId_idx" ON "group_level_rule"("groupId");

-- CreateIndex
CREATE INDEX "group_level_rule_levelId_idx" ON "group_level_rule"("levelId");

-- CreateIndex
CREATE UNIQUE INDEX "group_level_rule_groupId_levelId_key" ON "group_level_rule"("groupId", "levelId");

-- AddForeignKey
ALTER TABLE "group_level_rule" ADD CONSTRAINT "group_level_rule_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_level_rule" ADD CONSTRAINT "group_level_rule_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "level"("id") ON DELETE CASCADE ON UPDATE CASCADE;
