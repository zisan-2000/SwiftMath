BEGIN;
ALTER TYPE "AuditAction" ADD VALUE 'GROUP_TEACHERS_UPDATED';
ALTER TABLE "group" ALTER COLUMN "teacherId" DROP NOT NULL;
ALTER TABLE "group" DROP CONSTRAINT "group_teacherId_fkey";
ALTER TABLE "group" ADD CONSTRAINT "group_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "user"(id) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "group" ADD COLUMN "assignmentRevision" INTEGER NOT NULL DEFAULT 1;
CREATE UNIQUE INDEX "group_id_instituteId_key" ON "group"(id,"instituteId");
CREATE UNIQUE INDEX "user_id_instituteId_key" ON "user"(id,"instituteId");
CREATE TABLE teacher_group_assignment (
  "groupId" TEXT NOT NULL,
  "teacherId" TEXT NOT NULL,
  "instituteId" TEXT NOT NULL,
  "assignedById" TEXT,
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("groupId","teacherId"),
  FOREIGN KEY ("groupId","instituteId") REFERENCES "group"(id,"instituteId") ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY ("teacherId","instituteId") REFERENCES "user"(id,"instituteId") ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY ("instituteId") REFERENCES institute(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY ("assignedById") REFERENCES "user"(id) ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "teacher_group_assignment_instituteId_teacherId_idx" ON teacher_group_assignment("instituteId","teacherId");
-- Abort rather than silently omit invalid legacy ownership.
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM "group" g JOIN "user" u ON u.id=g."teacherId" WHERE u."instituteId"<>g."instituteId" OR u.role<>'TEACHER') THEN
   RAISE EXCEPTION 'Invalid legacy group ownership: reconcile institute/teacher role before migration';
 END IF;
END $$;
INSERT INTO teacher_group_assignment("groupId","teacherId","instituteId","assignedAt")
 SELECT id,"teacherId","instituteId","createdAt" FROM "group" WHERE "teacherId" IS NOT NULL;
CREATE FUNCTION validate_group_teacher_assignment() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM "user" WHERE id=NEW."teacherId" AND role='TEACHER' AND "instituteId"=NEW."instituteId") THEN
   RAISE EXCEPTION 'Group assignment requires a teacher in the same institute' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER validate_group_teacher_assignment BEFORE INSERT OR UPDATE ON teacher_group_assignment
 FOR EACH ROW EXECUTE FUNCTION validate_group_teacher_assignment();
ALTER TABLE homework_schedule ADD COLUMN "originGroupId" TEXT;
UPDATE homework_schedule SET "originGroupId"="groupId" WHERE "groupId" IS NOT NULL;
-- The creation audit is the historical source. Never infer from current student placement.
UPDATE homework_schedule s SET "originGroupId"=a."groupId" FROM (
 SELECT DISTINCT ON (l."targetId") l."targetId",l."actorUserId",g.id AS "groupId",g."instituteId"
 FROM audit_log l JOIN "group" g ON g.id=l.metadata->>'groupId' AND g."instituteId"=l."instituteId"
 WHERE l.action='HOMEWORK_SCHEDULE_CREATED' AND l."targetType"='HomeworkSchedule' ORDER BY l."targetId",l."createdAt"
) a WHERE s.id=a."targetId" AND s."createdById"=a."actorUserId" AND s."instituteId"=a."instituteId" AND s."originGroupId" IS NULL;
ALTER TABLE homework_schedule ADD CONSTRAINT "homework_schedule_originGroupId_instituteId_fkey" FOREIGN KEY ("originGroupId","instituteId") REFERENCES "group"(id,"instituteId") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "homework_schedule_originGroupId_idx" ON homework_schedule("originGroupId");
DO $$ DECLARE unresolved INTEGER; BEGIN
 SELECT count(*) INTO unresolved FROM homework_schedule WHERE "originGroupId" IS NULL;
 IF unresolved>0 THEN RAISE WARNING '% legacy homework schedules have no verifiable original group; Admin/student history remains intact. Review historical creation records before manually mapping originGroupId.', unresolved; END IF;
END $$;
-- Add scope metadata without changing any historical event payload or actor.
ALTER TABLE audit_log ADD COLUMN "scopeGroupId" TEXT;
UPDATE audit_log a SET "scopeGroupId"=g.id FROM "group" g
 WHERE g.id=(a.metadata->>'groupId') AND g."instituteId"=a."instituteId";
UPDATE audit_log a SET "scopeGroupId"=s."originGroupId" FROM homework_schedule s
 WHERE a."targetId"=s.id AND a."instituteId"=s."instituteId" AND a."targetType"='HomeworkSchedule' AND s."originGroupId" IS NOT NULL;
UPDATE audit_log a SET "scopeGroupId"=s."originGroupId"
 FROM homework_submission sub JOIN homework_expectation e ON e.id=sub."expectationId"
 JOIN homework_occurrence o ON o.id=e."occurrenceId" JOIN homework_schedule s ON s.id=o."scheduleId"
 WHERE a."targetId"=sub.id AND a."targetType"='HomeworkSubmission' AND a."instituteId"=s."instituteId" AND s."originGroupId" IS NOT NULL;
ALTER TABLE audit_log ADD CONSTRAINT "audit_log_scopeGroupId_fkey" FOREIGN KEY ("scopeGroupId") REFERENCES "group"(id) ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "audit_log_scopeGroupId_createdAt_idx" ON audit_log("scopeGroupId","createdAt" DESC);
CREATE FUNCTION preserve_homework_origin_group() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='UPDATE' AND OLD."originGroupId" IS NOT NULL AND NEW."originGroupId" IS DISTINCT FROM OLD."originGroupId" THEN
   RAISE EXCEPTION 'Historical homework group scope is immutable' USING ERRCODE='23514';
 END IF;
 IF NEW."originGroupId" IS NULL AND NEW."groupId" IS NOT NULL THEN NEW."originGroupId"=NEW."groupId"; END IF;
 IF NEW."groupId" IS NOT NULL AND NEW."originGroupId" IS DISTINCT FROM NEW."groupId" THEN
   RAISE EXCEPTION 'Group homework must retain its original group' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER preserve_homework_origin_group BEFORE INSERT OR UPDATE ON homework_schedule
 FOR EACH ROW EXECUTE FUNCTION preserve_homework_origin_group();
COMMIT;
