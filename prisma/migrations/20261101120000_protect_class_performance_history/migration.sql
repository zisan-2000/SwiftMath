-- Additive migration: existing dates, marks, attendance and timestamps stay intact.
BEGIN;
ALTER TABLE "class_performance" ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "class_performance" ADD CONSTRAINT "class_performance_revision_positive" CHECK ("revision" > 0);

CREATE TABLE "class_performance_change" (
  "id" TEXT PRIMARY KEY,
  "instituteId" TEXT NOT NULL,
  "groupId" TEXT NOT NULL,
  "sheetId" TEXT NOT NULL,
  "classDate" DATE NOT NULL,
  "studentId" TEXT NOT NULL,
  "editorId" TEXT NOT NULL,
  "revision" INTEGER NOT NULL CHECK ("revision" > 0),
  "previousMark" DECIMAL(8,2),
  "updatedMark" DECIMAL(8,2) NOT NULL,
  "previousStatus" "ClassPerformanceStatus",
  "updatedStatus" "ClassPerformanceStatus" NOT NULL,
  "previousMaximumMark" DECIMAL(8,2),
  "updatedMaximumMark" DECIMAL(8,2) NOT NULL,
  "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "class_performance_change_sheetId_revision_studentId_key" ON "class_performance_change"("sheetId", "revision", "studentId");
CREATE INDEX "class_performance_change_instituteId_sheetId_changedAt_idx" ON "class_performance_change"("instituteId", "sheetId", "changedAt");
CREATE INDEX "class_performance_change_studentId_classDate_idx" ON "class_performance_change"("studentId", "classDate");

CREATE FUNCTION reject_class_performance_history_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Class performance history is append-only';
END;
$$;
CREATE TRIGGER class_performance_history_immutable
BEFORE UPDATE OR DELETE OR TRUNCATE ON "class_performance_change"
FOR EACH STATEMENT EXECUTE FUNCTION reject_class_performance_history_mutation();
COMMIT;
