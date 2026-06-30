-- CreateEnum
CREATE TYPE "QuestionStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- AlterTable
ALTER TABLE "level_question" ADD COLUMN "status" "QuestionStatus" NOT NULL DEFAULT 'PUBLISHED';

-- AlterTable
ALTER TABLE "level_question" ALTER COLUMN "status" SET DEFAULT 'DRAFT';

-- CreateIndex
CREATE INDEX "level_question_levelId_status_idx" ON "level_question"("levelId", "status");
