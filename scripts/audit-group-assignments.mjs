// Read-only preflight/postflight. Outputs counts and opaque IDs, never student data.
import "dotenv/config";
import { Client } from "pg";

const db = new Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
try {
  await db.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  const exists = (
    await db.query(
      "SELECT to_regclass('teacher_group_assignment') IS NOT NULL AS ready",
    )
  ).rows[0].ready;
  const invalidOwners = (
    await db.query(
      `SELECT g.id FROM "group" g JOIN "user" u ON u.id=g."teacherId" WHERE u."instituteId"<>g."instituteId" OR u.role<>'TEACHER' ORDER BY g.id`,
    )
  ).rows;
  const unmappedQuery = exists
    ? `SELECT s.id FROM homework_schedule s WHERE s."originGroupId" IS NULL ORDER BY s.id`
    : `SELECT s.id FROM homework_schedule s WHERE s."groupId" IS NULL AND NOT EXISTS (
        SELECT 1 FROM audit_log a JOIN "group" g ON g.id=(a.metadata->>'groupId') AND g."instituteId"=a."instituteId"
        WHERE a.action='HOMEWORK_SCHEDULE_CREATED' AND a."targetType"='HomeworkSchedule' AND a."actorUserId"=s."createdById" AND a."targetId"=s.id AND a."instituteId"=s."instituteId"
      ) ORDER BY s.id`;
  const unmapped = (await db.query(unmappedQuery)).rows;
  const groups = (await db.query('SELECT count(*)::int AS total FROM "group"'))
    .rows[0].total;
  const assigned = exists
    ? (
        await db.query(
          "SELECT count(*)::int AS total FROM teacher_group_assignment",
        )
      ).rows[0].total
    : null;
  const driftedGroups = exists
    ? (
        await db.query(`SELECT g.id FROM "group" g WHERE g."teacherId" IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM teacher_group_assignment a WHERE a."groupId"=g.id AND a."teacherId"=g."teacherId" AND a."instituteId"=g."instituteId"
      ) ORDER BY g.id`)
      ).rows
    : [];
  await db.query("COMMIT");
  console.log(
    JSON.stringify(
      {
        event: "teacher-group-assignment-audit",
        schema: exists ? "many-to-many" : "legacy",
        groups,
        assignments: assigned,
        legacyGroupsWithoutAssignment: driftedGroups.length,
        driftedGroupIds: driftedGroups.slice(0, 500).map((row) => row.id),
        invalidLegacyOwners: invalidOwners.length,
        invalidLegacyGroupIds: invalidOwners.slice(0, 500).map((row) => row.id),
        unmappedHomeworkSchedules: unmapped.length,
        unmappedScheduleIds: unmapped.slice(0, 500).map((row) => row.id),
        requiresManualReview:
          invalidOwners.length > 0 ||
          unmapped.length > 0 ||
          driftedGroups.length > 0,
        note: "No data changed. Missing historical scope must be verified from original assignment records, never inferred from current student placement.",
      },
      null,
      2,
    ),
  );
  if (invalidOwners.length || unmapped.length || driftedGroups.length)
    process.exitCode = 2;
} finally {
  await db.end();
}
