-- Teacher-entered class performance is intentionally separate from automatic
-- practice/exam scoring and level progression.
CREATE TYPE "ClassPerformanceStatus" AS ENUM ('PRESENT', 'ABSENT');

ALTER TYPE "AuditAction" ADD VALUE 'CLASS_PERFORMANCE_RECORDED';
ALTER TYPE "AuditAction" ADD VALUE 'CLASS_PERFORMANCE_UPDATED';

CREATE TABLE "class_performance" (
    "id" TEXT NOT NULL,
    "instituteId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "classDate" DATE NOT NULL,
    "maximumMark" DECIMAL(8,2) NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "class_performance_maximumMark_check" CHECK ("maximumMark" > 0),
    CONSTRAINT "class_performance_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "class_performance_entry" (
    "id" TEXT NOT NULL,
    "instituteId" TEXT NOT NULL,
    "classPerformanceId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "mark" DECIMAL(8,2) NOT NULL,
    "status" "ClassPerformanceStatus" NOT NULL DEFAULT 'PRESENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "class_performance_entry_mark_check" CHECK ("mark" >= 0),
    CONSTRAINT "class_performance_entry_absent_zero_check" CHECK ("status" <> 'ABSENT' OR "mark" = 0),
    CONSTRAINT "class_performance_entry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "class_performance_groupId_classDate_key" ON "class_performance"("groupId", "classDate");
CREATE INDEX "class_performance_instituteId_classDate_idx" ON "class_performance"("instituteId", "classDate");
CREATE INDEX "class_performance_groupId_classDate_idx" ON "class_performance"("groupId", "classDate");
CREATE UNIQUE INDEX "class_performance_entry_classPerformanceId_studentId_key" ON "class_performance_entry"("classPerformanceId", "studentId");
CREATE INDEX "class_performance_entry_instituteId_idx" ON "class_performance_entry"("instituteId");
CREATE INDEX "class_performance_entry_studentId_idx" ON "class_performance_entry"("studentId");

ALTER TABLE "class_performance" ADD CONSTRAINT "class_performance_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "institute"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "class_performance" ADD CONSTRAINT "class_performance_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "class_performance" ADD CONSTRAINT "class_performance_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "class_performance_entry" ADD CONSTRAINT "class_performance_entry_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "institute"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "class_performance_entry" ADD CONSTRAINT "class_performance_entry_classPerformanceId_fkey" FOREIGN KEY ("classPerformanceId") REFERENCES "class_performance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "class_performance_entry" ADD CONSTRAINT "class_performance_entry_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
