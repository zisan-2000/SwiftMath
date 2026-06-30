-- CreateTable
CREATE TABLE "curriculum_version" (
    "id" TEXT NOT NULL,
    "instituteId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "label" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "curriculum_version_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "institute" ADD COLUMN "activeCurriculumVersionId" TEXT;

-- AlterTable
ALTER TABLE "level_question" ADD COLUMN "curriculumVersionId" TEXT;

-- AlterTable
ALTER TABLE "scheduled_exam" ADD COLUMN "curriculumVersionId" TEXT;

-- AlterTable
ALTER TABLE "practice_session" ADD COLUMN "curriculumVersionId" TEXT;

-- Backfill version 1 for every institute
INSERT INTO "curriculum_version" ("id", "instituteId", "versionNumber", "publishedAt", "createdAt")
SELECT "id" || '-cv-1', "id", 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "institute";

UPDATE "institute" AS i
SET "activeCurriculumVersionId" = cv."id"
FROM "curriculum_version" AS cv
WHERE cv."instituteId" = i."id" AND cv."versionNumber" = 1;

UPDATE "level_question" AS lq
SET "curriculumVersionId" = i."activeCurriculumVersionId"
FROM "institute" AS i
WHERE lq."instituteId" = i."id" AND lq."status" = 'PUBLISHED';

-- CreateIndex
CREATE UNIQUE INDEX "curriculum_version_instituteId_versionNumber_key" ON "curriculum_version"("instituteId", "versionNumber");

-- CreateIndex
CREATE INDEX "curriculum_version_instituteId_idx" ON "curriculum_version"("instituteId");

-- CreateIndex
CREATE INDEX "level_question_levelId_curriculumVersionId_idx" ON "level_question"("levelId", "curriculumVersionId");

-- AddForeignKey
ALTER TABLE "institute" ADD CONSTRAINT "institute_activeCurriculumVersionId_fkey" FOREIGN KEY ("activeCurriculumVersionId") REFERENCES "curriculum_version"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curriculum_version" ADD CONSTRAINT "curriculum_version_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "institute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "level_question" ADD CONSTRAINT "level_question_curriculumVersionId_fkey" FOREIGN KEY ("curriculumVersionId") REFERENCES "curriculum_version"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_exam" ADD CONSTRAINT "scheduled_exam_curriculumVersionId_fkey" FOREIGN KEY ("curriculumVersionId") REFERENCES "curriculum_version"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_session" ADD CONSTRAINT "practice_session_curriculumVersionId_fkey" FOREIGN KEY ("curriculumVersionId") REFERENCES "curriculum_version"("id") ON DELETE SET NULL ON UPDATE CASCADE;
