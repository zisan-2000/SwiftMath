-- CreateEnum
CREATE TYPE "QuestionDifficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateTable
CREATE TABLE "level_question" (
    "id" TEXT NOT NULL,
    "instituteId" TEXT NOT NULL,
    "levelId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "correctAnswer" INTEGER NOT NULL,
    "category" TEXT,
    "difficulty" "QuestionDifficulty" NOT NULL DEFAULT 'MEDIUM',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "level_question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_question_rule" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "group_question_rule_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "practice_question" ADD COLUMN "sourceQuestionId" TEXT;

-- CreateIndex
CREATE INDEX "level_question_instituteId_idx" ON "level_question"("instituteId");

-- CreateIndex
CREATE INDEX "level_question_levelId_idx" ON "level_question"("levelId");

-- CreateIndex
CREATE INDEX "level_question_levelId_isActive_idx" ON "level_question"("levelId", "isActive");

-- CreateIndex
CREATE INDEX "group_question_rule_groupId_idx" ON "group_question_rule"("groupId");

-- CreateIndex
CREATE INDEX "group_question_rule_questionId_idx" ON "group_question_rule"("questionId");

-- CreateIndex
CREATE INDEX "practice_question_sourceQuestionId_idx" ON "practice_question"("sourceQuestionId");

-- CreateIndex
CREATE UNIQUE INDEX "group_question_rule_groupId_questionId_key" ON "group_question_rule"("groupId", "questionId");

-- AddForeignKey
ALTER TABLE "level_question" ADD CONSTRAINT "level_question_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "institute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "level_question" ADD CONSTRAINT "level_question_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "level"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_question_rule" ADD CONSTRAINT "group_question_rule_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_question_rule" ADD CONSTRAINT "group_question_rule_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "level_question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_question" ADD CONSTRAINT "practice_question_sourceQuestionId_fkey" FOREIGN KEY ("sourceQuestionId") REFERENCES "level_question"("id") ON DELETE SET NULL ON UPDATE CASCADE;
