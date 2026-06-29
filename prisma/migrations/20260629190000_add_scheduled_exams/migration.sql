-- AlterEnum
ALTER TYPE "PracticeMode" ADD VALUE 'EXAM';

-- CreateTable
CREATE TABLE "scheduled_exam" (
    "id" TEXT NOT NULL,
    "instituteId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "levelId" TEXT NOT NULL,
    "title" TEXT,
    "opensAt" TIMESTAMP(3) NOT NULL,
    "closesAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scheduled_exam_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "practice_session" ADD COLUMN "scheduledExamId" TEXT;

-- CreateIndex
CREATE INDEX "scheduled_exam_instituteId_idx" ON "scheduled_exam"("instituteId");

-- CreateIndex
CREATE INDEX "scheduled_exam_groupId_idx" ON "scheduled_exam"("groupId");

-- CreateIndex
CREATE INDEX "scheduled_exam_opensAt_closesAt_idx" ON "scheduled_exam"("opensAt", "closesAt");

-- CreateIndex
CREATE INDEX "practice_session_scheduledExamId_idx" ON "practice_session"("scheduledExamId");

-- CreateIndex
CREATE UNIQUE INDEX "practice_session_studentId_scheduledExamId_key" ON "practice_session"("studentId", "scheduledExamId");

-- AddForeignKey
ALTER TABLE "scheduled_exam" ADD CONSTRAINT "scheduled_exam_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "institute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_exam" ADD CONSTRAINT "scheduled_exam_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_exam" ADD CONSTRAINT "scheduled_exam_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "level"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_exam" ADD CONSTRAINT "scheduled_exam_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_session" ADD CONSTRAINT "practice_session_scheduledExamId_fkey" FOREIGN KEY ("scheduledExamId") REFERENCES "scheduled_exam"("id") ON DELETE SET NULL ON UPDATE CASCADE;
