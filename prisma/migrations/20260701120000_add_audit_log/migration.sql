-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('QUESTION_CREATED', 'QUESTION_UPDATED', 'QUESTION_DELETED', 'QUESTION_PUBLISHED', 'QUESTION_UNPUBLISHED', 'QUESTION_ENABLED', 'QUESTION_DISABLED', 'QUESTIONS_IMPORTED', 'QUESTIONS_REORDERED', 'GROUP_QUESTION_ENABLED', 'GROUP_QUESTION_DISABLED', 'CURRICULUM_VERSION_BUMPED', 'LEVEL_BANK_ONLY_ENABLED', 'LEVEL_BANK_ONLY_DISABLED');

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "instituteId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "actorRole" "Role" NOT NULL,
    "action" "AuditAction" NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "summary" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_log_instituteId_createdAt_idx" ON "audit_log"("instituteId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "audit_log_instituteId_action_idx" ON "audit_log"("instituteId", "action");

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "institute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
