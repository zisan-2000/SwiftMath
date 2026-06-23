-- CreateEnum
CREATE TYPE "PracticeMode" AS ENUM ('STANDARD', 'REVIEW');

-- AlterTable
ALTER TABLE "practice_session" ADD COLUMN "mode" "PracticeMode" NOT NULL DEFAULT 'STANDARD';
