-- Independent, teacher-controlled Academic Level. Existing "level" and
-- "currentLevelId" remain untouched for practice/exam progression.
CREATE TYPE "HomeworkScheduleMode" AS ENUM ('WEEKLY_RECURRING', 'MANUAL_SPECIFIC');
CREATE TYPE "HomeworkTargetType" AS ENUM ('GROUP', 'STUDENT');
CREATE TYPE "HomeworkScheduleStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ARCHIVED');
CREATE TYPE "HomeworkSubmissionStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED', 'APPROVED', 'REJECTED', 'RESUBMISSION_REQUESTED');

ALTER TYPE "AuditAction" ADD VALUE 'ACADEMIC_LEVEL_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'ACADEMIC_LEVEL_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'STUDENT_ACADEMIC_LEVEL_CHANGED';
ALTER TYPE "AuditAction" ADD VALUE 'HOMEWORK_SCHEDULE_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'HOMEWORK_SCHEDULE_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'HOMEWORK_SUBMISSION_REVIEWED';

CREATE TABLE "academic_level" (
  "id" TEXT NOT NULL,
  "instituteId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "orderIndex" INTEGER NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "academic_level_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "academic_level_order_check" CHECK ("orderIndex" > 0)
);

ALTER TABLE "user" ADD COLUMN "academicLevelId" TEXT;

CREATE TABLE "homework_schedule" (
  "id" TEXT NOT NULL,
  "instituteId" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "mode" "HomeworkScheduleMode" NOT NULL,
  "targetType" "HomeworkTargetType" NOT NULL,
  "groupId" TEXT,
  "studentId" TEXT,
  "title" TEXT NOT NULL,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3),
  "manualOpensAt" TIMESTAMP(3),
  "manualDueAt" TIMESTAMP(3),
  "maxScore" DECIMAL(8,2) NOT NULL,
  "timeLimitMinutes" INTEGER NOT NULL,
  "showTimer" BOOLEAN NOT NULL DEFAULT true,
  "allowSamePageAgain" BOOLEAN NOT NULL DEFAULT false,
  "status" "HomeworkScheduleStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "homework_schedule_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "homework_schedule_target_check" CHECK (
    ("targetType" = 'GROUP' AND "groupId" IS NOT NULL AND "studentId" IS NULL) OR
    ("targetType" = 'STUDENT' AND "studentId" IS NOT NULL AND "groupId" IS NULL)
  ),
  CONSTRAINT "homework_schedule_mode_check" CHECK (
    ("mode" = 'WEEKLY_RECURRING' AND "manualOpensAt" IS NULL AND "manualDueAt" IS NULL) OR
    ("mode" = 'MANUAL_SPECIFIC' AND "manualOpensAt" IS NOT NULL AND "manualDueAt" IS NOT NULL)
  ),
  CONSTRAINT "homework_schedule_score_check" CHECK ("maxScore" > 0),
  CONSTRAINT "homework_schedule_time_check" CHECK ("timeLimitMinutes" > 0),
  CONSTRAINT "homework_schedule_dates_check" CHECK ("endDate" IS NULL OR "endDate" >= "startDate"),
  CONSTRAINT "homework_schedule_manual_window_check" CHECK ("manualDueAt" IS NULL OR "manualDueAt" > "manualOpensAt")
);

CREATE TABLE "homework_schedule_slot" (
  "id" TEXT NOT NULL,
  "scheduleId" TEXT NOT NULL,
  "dayOfWeek" INTEGER NOT NULL,
  "openMinute" INTEGER NOT NULL,
  "dueMinute" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "homework_schedule_slot_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "homework_schedule_slot_day_check" CHECK ("dayOfWeek" BETWEEN 0 AND 6),
  CONSTRAINT "homework_schedule_slot_minute_check" CHECK ("openMinute" BETWEEN 0 AND 1439 AND "dueMinute" BETWEEN 1 AND 1439 AND "dueMinute" > "openMinute")
);

CREATE TABLE "homework_occurrence" (
  "id" TEXT NOT NULL,
  "instituteId" TEXT NOT NULL,
  "scheduleId" TEXT NOT NULL,
  "opensAt" TIMESTAMP(3) NOT NULL,
  "dueAt" TIMESTAMP(3) NOT NULL,
  "maxScoreSnapshot" DECIMAL(8,2) NOT NULL,
  "timeLimitMinutesSnapshot" INTEGER NOT NULL,
  "showTimerSnapshot" BOOLEAN NOT NULL,
  "allowSamePageAgainSnapshot" BOOLEAN NOT NULL,
  "expectationsMaterializedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "homework_occurrence_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "homework_occurrence_window_check" CHECK ("dueAt" > "opensAt"),
  CONSTRAINT "homework_occurrence_score_check" CHECK ("maxScoreSnapshot" > 0),
  CONSTRAINT "homework_occurrence_time_check" CHECK ("timeLimitMinutesSnapshot" > 0)
);

CREATE TABLE "homework_expectation" (
  "id" TEXT NOT NULL,
  "instituteId" TEXT NOT NULL,
  "occurrenceId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "academicLevelIdSnapshot" TEXT,
  "academicLevelNameSnapshot" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "homework_expectation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "homework_submission" (
  "id" TEXT NOT NULL,
  "expectationId" TEXT NOT NULL,
  "attemptNumber" INTEGER NOT NULL,
  "pageNumber" TEXT NOT NULL,
  "firstPhotoKey" TEXT NOT NULL,
  "finalPhotoKey" TEXT,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "submittedAt" TIMESTAMP(3),
  "completionSeconds" INTEGER,
  "isLate" BOOLEAN,
  "lateBySeconds" INTEGER,
  "isOverTimeLimit" BOOLEAN,
  "overtimeSeconds" INTEGER,
  "status" "HomeworkSubmissionStatus" NOT NULL DEFAULT 'IN_PROGRESS',
  "score" DECIMAL(8,2),
  "teacherComment" TEXT,
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "homework_submission_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "homework_submission_attempt_check" CHECK ("attemptNumber" > 0),
  CONSTRAINT "homework_submission_score_check" CHECK ("score" IS NULL OR "score" >= 0)
);

CREATE UNIQUE INDEX "academic_level_instituteId_orderIndex_key" ON "academic_level"("instituteId", "orderIndex");
CREATE INDEX "academic_level_instituteId_isActive_idx" ON "academic_level"("instituteId", "isActive");
CREATE INDEX "user_academicLevelId_idx" ON "user"("academicLevelId");
CREATE INDEX "homework_schedule_instituteId_status_idx" ON "homework_schedule"("instituteId", "status");
CREATE INDEX "homework_schedule_groupId_idx" ON "homework_schedule"("groupId");
CREATE INDEX "homework_schedule_studentId_idx" ON "homework_schedule"("studentId");
CREATE INDEX "homework_schedule_createdById_idx" ON "homework_schedule"("createdById");
CREATE UNIQUE INDEX "homework_schedule_slot_scheduleId_dayOfWeek_key" ON "homework_schedule_slot"("scheduleId", "dayOfWeek");
CREATE INDEX "homework_schedule_slot_scheduleId_idx" ON "homework_schedule_slot"("scheduleId");
CREATE UNIQUE INDEX "homework_occurrence_scheduleId_opensAt_key" ON "homework_occurrence"("scheduleId", "opensAt");
CREATE INDEX "homework_occurrence_instituteId_opensAt_idx" ON "homework_occurrence"("instituteId", "opensAt");
CREATE INDEX "homework_occurrence_scheduleId_dueAt_idx" ON "homework_occurrence"("scheduleId", "dueAt");
CREATE UNIQUE INDEX "homework_expectation_occurrenceId_studentId_key" ON "homework_expectation"("occurrenceId", "studentId");
CREATE INDEX "homework_expectation_instituteId_studentId_idx" ON "homework_expectation"("instituteId", "studentId");
CREATE INDEX "homework_expectation_studentId_createdAt_idx" ON "homework_expectation"("studentId", "createdAt");
CREATE UNIQUE INDEX "homework_submission_expectationId_attemptNumber_key" ON "homework_submission"("expectationId", "attemptNumber");
CREATE INDEX "homework_submission_expectationId_status_idx" ON "homework_submission"("expectationId", "status");
CREATE INDEX "homework_submission_reviewedById_idx" ON "homework_submission"("reviewedById");

ALTER TABLE "academic_level" ADD CONSTRAINT "academic_level_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "institute"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user" ADD CONSTRAINT "user_academicLevelId_fkey" FOREIGN KEY ("academicLevelId") REFERENCES "academic_level"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "homework_schedule" ADD CONSTRAINT "homework_schedule_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "institute"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "homework_schedule" ADD CONSTRAINT "homework_schedule_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "homework_schedule" ADD CONSTRAINT "homework_schedule_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "homework_schedule" ADD CONSTRAINT "homework_schedule_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "homework_schedule_slot" ADD CONSTRAINT "homework_schedule_slot_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "homework_schedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "homework_occurrence" ADD CONSTRAINT "homework_occurrence_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "institute"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "homework_occurrence" ADD CONSTRAINT "homework_occurrence_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "homework_schedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "homework_expectation" ADD CONSTRAINT "homework_expectation_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "institute"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "homework_expectation" ADD CONSTRAINT "homework_expectation_occurrenceId_fkey" FOREIGN KEY ("occurrenceId") REFERENCES "homework_occurrence"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "homework_expectation" ADD CONSTRAINT "homework_expectation_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "homework_submission" ADD CONSTRAINT "homework_submission_expectationId_fkey" FOREIGN KEY ("expectationId") REFERENCES "homework_expectation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "homework_submission" ADD CONSTRAINT "homework_submission_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Existing students intentionally remain unassigned. Academic Level is an
-- independent offline concept, so deriving it from practice currentLevelId
-- would create false data. Admin/teachers can safely assign it after deploy.
