import { randomUUID } from "node:crypto";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/lib/generated/prisma/client";
import { PERMISSIONS } from "@/lib/permissions";
import { verifyPassword } from "better-auth/crypto";

const context = vi.hoisted(() => ({ db: null as unknown as PrismaClient }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({
  get prisma() {
    return context.db;
  },
}));
vi.mock("@/lib/session", () => ({ getCurrentUser: async () => null }));
vi.mock("@/server/web-push", () => ({ sendPushToUser: async () => {} }));
const url = process.env.CLASS_PERFORMANCE_TEST_DATABASE_URL;

describe.skipIf(!url)(
  "multi-teacher authorization and preservation — isolated PostgreSQL",
  () => {
    let assignments: typeof import("@/server/group-assignments");
    let teachers: typeof import("@/server/teacher");
    let homework: typeof import("@/server/homework");
    let performance: typeof import("@/server/class-performance");
    let exams: typeof import("@/server/scheduled-exam");
    let questions: typeof import("@/server/question-bank");
    let analytics: typeof import("@/server/analytics");
    let permissions: typeof import("@/server/permissions");
    let admin: { id: string; instituteId: string; role: "ADMIN" };
    let a: { id: string; instituteId: string; role: "TEACHER" };
    let b: typeof a, outsider: typeof a, foreign: typeof a;
    let groupId: string, studentId: string, levelId: string;
    const db = () => context.db;
    beforeAll(async () => {
      const parsed = new URL(url!);
      if (
        !/^(localhost|127\.0\.0\.1|\[::1\])$/.test(parsed.hostname) ||
        !/^\/swiftmath_cp_regression_\d+$/.test(parsed.pathname)
      )
        throw Error("Isolated local database required");
      context.db = new PrismaClient({
        adapter: new PrismaPg({ connectionString: url! }),
      });
      assignments = await import("@/server/group-assignments");
      teachers = await import("@/server/teacher");
      homework = await import("@/server/homework");
      performance = await import("@/server/class-performance");
      exams = await import("@/server/scheduled-exam");
      questions = await import("@/server/question-bank");
      analytics = await import("@/server/analytics");
      permissions = await import("@/server/permissions");
    });
    beforeEach(async () => {
      const institute = await db().institute.create({
        data: { name: "Assignment test", slug: randomUUID() },
      });
      const second = await db().institute.create({
        data: { name: "Foreign tenant", slug: randomUUID() },
      });
      async function user(
        role: "ADMIN" | "TEACHER" | "STUDENT",
        instituteId = institute.id,
      ) {
        return db().user.create({
          data: {
            name: role,
            email: `${randomUUID()}@invalid.test`,
            role,
            instituteId,
          },
        });
      }
      admin = { ...(await user("ADMIN")), role: "ADMIN" };
      a = { ...(await user("TEACHER")), role: "TEACHER" };
      b = { ...(await user("TEACHER")), role: "TEACHER" };
      outsider = { ...(await user("TEACHER")), role: "TEACHER" };
      foreign = { ...(await user("TEACHER", second.id)), role: "TEACHER" };
      expect(
        await assignments.saveAdminGroupAssignments(admin, {
          name: "Shared",
          teacherIds: [a.id, b.id],
        }),
      ).toMatchObject({ ok: true });
      groupId = (
        await db().group.findFirstOrThrow({
          where: { instituteId: institute.id, name: "Shared" },
        })
      ).id;
      const student = await user("STUDENT");
      studentId = student.id;
      await db().user.update({ where: { id: studentId }, data: { groupId } });
      levelId = (
        await db().level.create({
          data: {
            instituteId: institute.id,
            name: "Sub-level",
            orderIndex: 1,
            questionCount: 2,
            timeLimitSeconds: 60,
            passAccuracy: 80,
            operation: "ADDITION",
            termsPerQuestion: 2,
            minNumber: 1,
            maxNumber: 9,
          },
        })
      ).id;
    });
    afterAll(async () => {
      await context.db?.$disconnect();
    });

    async function task(individual = false) {
      const now = Date.now();
      return homework.createHomeworkSchedule(a, {
        groupId,
        targetStudentId: individual ? studentId : null,
        title: "Shared homework",
        mode: "MANUAL_SPECIFIC",
        startDate: new Date(now - 86400000),
        manualOpensAt: new Date(now - 60000),
        manualDueAt: new Date(now + 3600000),
        slots: [],
        maxScore: 10,
        timeLimitMinutes: 30,
        showTimer: true,
        allowSamePageAgain: false,
      });
    }
    async function submitted(scheduleId: string) {
      const expectation = await db().homeworkExpectation.findFirstOrThrow({
        where: { occurrence: { scheduleId }, studentId },
      });
      return db().homeworkSubmission.create({
        data: {
          expectationId: expectation.id,
          attemptNumber: 1,
          pageNumber: "49",
          firstPhotoKey: "blob:synthetic-first",
          finalPhotoKey: "blob:synthetic-final",
          status: "SUBMITTED",
          startedAt: new Date(),
          submittedAt: new Date(),
        },
      });
    }
    const sheet = (date = "2026-11-08", mark = "8.5") => ({
      groupId,
      mode: "create" as const,
      classDate: date,
      maximumMark: "10",
      entries: [{ studentId, mark, status: "PRESENT" as const }],
    });

    it("backfills legacy ownership and original individual scope without changing historical marks", async () => {
      expect(
        await db().teacherGroupAssignment.findUnique({
          where: {
            groupId_teacherId: {
              groupId: "migration-group",
              teacherId: "migration-teacher",
            },
          },
        }),
      ).not.toBeNull();
      expect(
        (
          await db().classPerformanceEntry.findUniqueOrThrow({
            where: { id: "migration-entry" },
          })
        ).mark.toString(),
      ).toBe("8.5");
      expect(
        (
          await db().homeworkSchedule.findUniqueOrThrow({
            where: { id: "assignment-migration-individual" },
          })
        ).originGroupId,
      ).toBe("migration-group");
      expect(
        (
          await db().homeworkSchedule.findUniqueOrThrow({
            where: { id: "assignment-migration-unmapped" },
          })
        ).originGroupId,
      ).toBeNull();
      expect(
        (
          await db().homeworkSubmission.findUniqueOrThrow({
            where: { id: "upload-migration-submission" },
          })
        ).firstPhotoKey,
      ).toBe("blob:homework/legacy-first.jpg");
    });
    it("both teachers see the same group and roster; one teacher can have several groups", async () => {
      await assignments.saveAdminGroupAssignments(admin, {
        name: "Second",
        teacherIds: [b.id],
      });
      expect(await teachers.listTeacherGroups(a)).toHaveLength(1);
      expect(await teachers.listTeacherGroups(b)).toHaveLength(2);
      expect((await teachers.listTeacherStudents(b)).map((s) => s.id)).toEqual([
        studentId,
      ]);
      expect(await teachers.getTeacherGroup(b, groupId)).not.toBeNull();
      expect(await teachers.getTeacherGroup(outsider, groupId)).toBeNull();
      expect(await teachers.getTeacherGroup(foreign, groupId)).toBeNull();
    });
    it("rejects cross-tenant, non-teacher and unauthorized admin assignments", async () => {
      expect(
        await assignments.saveAdminGroupAssignments(
          admin,
          { name: "Bad", teacherIds: [foreign.id] },
          groupId,
        ),
      ).toMatchObject({ ok: false });
      expect(
        await assignments.saveAdminGroupAssignments(
          admin,
          { name: "Bad", teacherIds: [foreign.id], revision: 1 },
          groupId,
        ),
      ).toMatchObject({ ok: false });
      expect(
        await assignments.saveAdminGroupAssignments(
          admin,
          { name: "Bad", teacherIds: [studentId], revision: 1 },
          groupId,
        ),
      ).toMatchObject({ ok: false });
      expect(
        await assignments.saveAdminGroupAssignments(
          a,
          { name: "Bad", teacherIds: [a.id], revision: 1 },
          groupId,
        ),
      ).toMatchObject({ ok: false });
      expect(
        await assignments.saveAdminGroupAssignments(
          { ...admin, instituteId: foreign.instituteId },
          { name: "Bad", teacherIds: [foreign.id], revision: 1 },
          groupId,
        ),
      ).toMatchObject({ ok: false });
      expect(
        await db().teacherGroupAssignment.count({ where: { groupId } }),
      ).toBe(2);
    });
    it("database constraints reject cross-institute and non-teacher membership and duplicates", async () => {
      await expect(
        db().teacherGroupAssignment.create({
          data: { groupId, teacherId: foreign.id, instituteId: a.instituteId },
        }),
      ).rejects.toThrow();
      await expect(
        db().teacherGroupAssignment.create({
          data: { groupId, teacherId: studentId, instituteId: a.instituteId },
        }),
      ).rejects.toThrow();
      await expect(
        db().teacherGroupAssignment.create({
          data: { groupId, teacherId: a.id, instituteId: a.instituteId },
        }),
      ).rejects.toThrow();
    });
    it("assignment never grants admin capabilities or defeats an explicit DENY", async () => {
      expect(await permissions.can(b, PERMISSIONS.GROUP_ASSIGN_TEACHER)).toBe(
        false,
      );
      expect(await permissions.can(b, PERMISSIONS.QUESTION_MANAGE)).toBe(false);
      await db().userPermission.create({
        data: {
          userId: b.id,
          permission: PERMISSIONS.HOMEWORK_MANAGE,
          effect: "DENY",
          grantedById: admin.id,
        },
      });
      expect(await permissions.can(b, PERMISSIONS.HOMEWORK_MANAGE)).toBe(false);
      expect(await teachers.getTeacherGroup(b, groupId)).not.toBeNull();
      await db().userPermission.create({
        data: {
          userId: admin.id,
          permission: PERMISSIONS.GROUP_ASSIGN_TEACHER,
          effect: "DENY",
          grantedById: admin.id,
        },
      });
      expect(
        await assignments.saveAdminGroupAssignments(
          admin,
          { name: "Denied", teacherIds: [], revision: 1 },
          groupId,
        ),
      ).toMatchObject({ ok: false });
    });
    it("legacy teacherId alone cannot grant access; an unassigned creator loses access", async () => {
      await assignments.saveAdminGroupAssignments(
        admin,
        { name: "Shared", teacherIds: [b.id], revision: 1 },
        groupId,
      );
      await db().group.update({
        where: { id: groupId },
        data: { teacherId: a.id },
      });
      expect(await teachers.getTeacherGroup(a, groupId)).toBeNull();
      expect(await teachers.getTeacherGroup(b, groupId)).not.toBeNull();
      await expect(
        performance.saveClassPerformance(a, sheet()),
      ).rejects.toThrow();
    });
    it("a co-teacher can manage students and group time settings", async () => {
      expect(
        await teachers.assignStudentLevel(b, studentId, levelId),
      ).toMatchObject({ ok: true });
      expect(
        await teachers.updateTeacherStudentContactNumber(
          b,
          studentId,
          "01712345678",
        ),
      ).toBe(true);
      expect(
        await teachers.setGroupLevelTimeRule(b, groupId, levelId, 120),
      ).toMatchObject({ ok: true });
      expect(
        await teachers.setGroupLevelTimeRule(outsider, groupId, levelId, 120),
      ).toMatchObject({ ok: false });
      const added = await teachers.addStudentToGroup(b, groupId, {
        name: "Synthetic added",
        email: `${randomUUID()}@invalid.test`,
        password: "Synthetic-only-Password1!",
      });
      expect(added.groupId).toBe(groupId);
      const messages = await db().notification.findMany({
        where: { type: "STUDENT_JOINED_GROUP", userId: { in: [a.id, b.id] } },
      });
      expect(new Set(messages.map((row) => row.userId))).toEqual(
        new Set([a.id, b.id]),
      );
      await db().session.create({
        data: {
          userId: added.id,
          token: randomUUID(),
          expiresAt: new Date(Date.now() + 3600000),
        },
      });
      expect(
        await teachers.resetStudentPassword(
          b,
          added.id,
          "Synthetic-new-password1!",
        ),
      ).toBe(true);
      const credential = await db().account.findFirstOrThrow({
        where: { userId: added.id, providerId: "credential" },
      });
      expect(
        await verifyPassword({
          hash: credential.password!,
          password: "Synthetic-new-password1!",
        }),
      ).toBe(true);
      expect(await db().session.count({ where: { userId: added.id } })).toBe(0);
      await assignments.saveAdminGroupAssignments(admin, {
        name: "Destination",
        teacherIds: [b.id],
      });
      const target = await db().group.findFirstOrThrow({
        where: { instituteId: a.instituteId, name: "Destination" },
      });
      expect(await teachers.moveStudentToGroup(a, added.id, target.id)).toBe(
        false,
      );
      expect(await teachers.moveStudentToGroup(b, added.id, target.id)).toBe(
        true,
      );
      expect(
        await teachers.resetStudentPassword(
          a,
          added.id,
          "Unauthorized-reset1!",
        ),
      ).toBe(false);
    });
    it("co-teachers create and view each other's exams, question settings and analytics", async () => {
      const exam = await exams.createScheduledExam(a, {
        groupId,
        levelId,
        title: "Shared exam",
        opensAt: new Date(Date.now() + 3600000),
        closesAt: new Date(Date.now() + 7200000),
      });
      expect(await exams.getTeacherScheduledExam(b, exam.id)).not.toBeNull();
      expect(await teachers.listTeacherScheduledExams(b)).toHaveLength(1);
      expect(await exams.getTeacherScheduledExam(outsider, exam.id)).toBeNull();
      expect(
        await analytics.getGroupPracticeAnalytics(b, groupId),
      ).not.toBeNull();
      expect(
        await analytics.getGroupPracticeAnalytics(foreign, groupId),
      ).toBeNull();
      expect(
        await questions.listGroupQuestionOverrides(b, groupId, levelId),
      ).not.toBeNull();
      const question = await db().levelQuestion.create({
        data: {
          instituteId: a.instituteId,
          levelId,
          prompt: "1 + 1",
          correctAnswer: 2,
          status: "PUBLISHED",
        },
      });
      expect(
        await questions.setGroupQuestionEnabled(b, groupId, question.id, false),
      ).toMatchObject({ ok: true });
      expect(
        (await questions.listGroupQuestionOverrides(a, groupId, levelId))!.find(
          (q) => q.id === question.id,
        )?.effectiveEnabled,
      ).toBe(false);
      expect(
        await questions.setGroupQuestionEnabled(
          outsider,
          groupId,
          question.id,
          true,
        ),
      ).toMatchObject({ ok: false });
      await exams.updateScheduledExam(b, exam.id, {
        title: "Co-teacher edited",
        opensAt: new Date(Date.now() + 7200000),
        closesAt: new Date(Date.now() + 10800000),
      });
      expect((await exams.getTeacherScheduledExam(a, exam.id))!.title).toBe(
        "Co-teacher edited",
      );
    });
    it("co-teachers update date-wise marks while existing revision protection still detects conflicts", async () => {
      await performance.saveClassPerformance(a, sheet());
      const loaded = (await performance.getGroupClassPerformanceWorkspace(
        b,
        groupId,
        "2026-11-08",
      ))!;
      expect(loaded.students[0].mark).toBe("8.5");
      const update = {
        ...sheet(),
        mode: "update" as const,
        sheetId: loaded.sheetId,
        revision: loaded.revision,
        entries: [{ studentId, mark: "7", status: "PRESENT" as const }],
      };
      const outcomes = await Promise.allSettled([
        performance.saveClassPerformance(a, update),
        performance.saveClassPerformance(b, update),
      ]);
      expect(outcomes.filter((r) => r.status === "fulfilled")).toHaveLength(1);
      expect(outcomes.filter((r) => r.status === "rejected")).toHaveLength(1);
      expect(
        await performance.getGroupClassPerformanceRanking(b, groupId, "all"),
      ).not.toBeNull();
    });
    it.each([false, true])(
      "all assigned teachers can review group/individual homework (%s) after a student move",
      async (individual) => {
        const schedule = await task(individual),
          submission = await submitted(schedule.id);
        expect(
          (await homework.getTeacherHomeworkWorkspace(
            b,
            groupId,
          ))!.schedules.map((s) => s.id),
        ).toContain(schedule.id);
        const target = await teachers.createGroup(outsider, "Moved group");
        await db().user.update({
          where: { id: studentId },
          data: { groupId: target.id },
        });
        expect(
          await homework.getTeacherOccurrence(b, submission.expectationId),
        ).toBeNull();
        expect(
          (await homework.getTeacherGlobalHomeworkHistory(b)).length,
        ).toBeGreaterThan(0);
        expect(
          await homework.getHomeworkPhotoAccess(b, submission.id, "first"),
        ).toBe("blob:synthetic-first");
        expect(
          await homework.getHomeworkPhotoAccess(
            outsider,
            submission.id,
            "first",
          ),
        ).toBeNull();
        expect(
          await homework.getHomeworkPhotoAccess(
            foreign,
            submission.id,
            "first",
          ),
        ).toBeNull();
        await homework.reviewHomeworkSubmission(b, {
          submissionId: submission.id,
          expectedUpdatedAt: submission.updatedAt.toISOString(),
          status: "APPROVED",
          score: 8.5,
        });
        expect(
          (
            await db().homeworkSubmission.findUniqueOrThrow({
              where: { id: submission.id },
            })
          ).reviewedById,
        ).toBe(b.id);
        await homework.setHomeworkScheduleStatus(b, schedule.id, "PAUSED");
        await expect(
          db().homeworkSchedule.update({
            where: { id: schedule.id },
            data: { originGroupId: target.id },
          }),
        ).rejects.toThrow();
      },
    );
    it("unassign revokes historical homework/photos while Admin and the student retain access", async () => {
      const schedule = await task(true),
        submission = await submitted(schedule.id);
      await assignments.saveAdminGroupAssignments(
        admin,
        { name: "Shared", teacherIds: [b.id], revision: 1 },
        groupId,
      );
      expect(await homework.getTeacherGlobalHomeworkHistory(a)).toEqual([]);
      expect(
        await homework.getHomeworkPhotoAccess(a, submission.id, "first"),
      ).toBeNull();
      expect(
        await homework.getHomeworkPhotoAccess(b, submission.id, "first"),
      ).not.toBeNull();
      expect(
        await homework.getHomeworkPhotoAccess(admin, submission.id, "first"),
      ).not.toBeNull();
      expect(
        await homework.getHomeworkPhotoAccess(
          { id: studentId, instituteId: a.instituteId, role: "STUDENT" },
          submission.id,
          "first",
        ),
      ).not.toBeNull();
      await expect(
        homework.reviewHomeworkSubmission(a, {
          submissionId: submission.id,
          expectedUpdatedAt: submission.updatedAt.toISOString(),
          status: "REJECTED",
        }),
      ).rejects.toThrow();
    });
    it("unassigning everyone preserves students, scores, submissions and original URLs", async () => {
      await performance.saveClassPerformance(a, sheet());
      const schedule = await task(),
        submission = await submitted(schedule.id);
      const before = await db().homeworkSubmission.findUniqueOrThrow({
        where: { id: submission.id },
      });
      expect(
        await assignments.saveAdminGroupAssignments(
          admin,
          { name: "Shared", teacherIds: [], revision: 1 },
          groupId,
        ),
      ).toMatchObject({ ok: true });
      expect(await teachers.listTeacherGroups(a)).toEqual([]);
      expect(await teachers.listTeacherGroups(b)).toEqual([]);
      expect(
        (await db().user.findUniqueOrThrow({ where: { id: studentId } }))
          .groupId,
      ).toBe(groupId);
      expect(
        await db().homeworkSubmission.findUniqueOrThrow({
          where: { id: submission.id },
        }),
      ).toEqual(before);
      expect(
        await db().classPerformanceEntry.count({ where: { studentId } }),
      ).toBe(1);
    });
    it("a stale homework review cannot overwrite another teacher's saved decision", async () => {
      const schedule = await task(),
        submission = await submitted(schedule.id);
      const expectedUpdatedAt = submission.updatedAt.toISOString();
      const result = await homework.reviewHomeworkSubmission(a, {
        submissionId: submission.id,
        expectedUpdatedAt,
        status: "APPROVED",
        score: 9,
      });
      await expect(
        homework.reviewHomeworkSubmission(b, {
          submissionId: submission.id,
          expectedUpdatedAt,
          status: "REJECTED",
        }),
      ).rejects.toThrow("Another teacher");
      expect(
        (
          await db().homeworkSubmission.findUniqueOrThrow({
            where: { id: submission.id },
          })
        ).score?.toString(),
      ).toBe("9");
      await homework.reviewHomeworkSubmission(b, {
        submissionId: submission.id,
        expectedUpdatedAt: result.updatedAt.toISOString(),
        status: "APPROVED",
        score: 8,
      });
      expect(
        (
          await db().homeworkSubmission.findUniqueOrThrow({
            where: { id: submission.id },
          })
        ).reviewedById,
      ).toBe(b.id);
    });
    it("disabled teachers cannot access groups, may be retained, and cannot be newly assigned", async () => {
      await db().user.update({
        where: { id: b.id },
        data: { isActive: false },
      });
      expect(await teachers.getTeacherGroup(b, groupId)).toBeNull();
      expect(
        await assignments.saveAdminGroupAssignments(
          admin,
          { name: "Shared", teacherIds: [a.id, b.id], revision: 1 },
          groupId,
        ),
      ).toMatchObject({ ok: true });
      expect(
        await assignments.saveAdminGroupAssignments(
          admin,
          { name: "Shared", teacherIds: [a.id], revision: 2 },
          groupId,
        ),
      ).toMatchObject({ ok: true });
      expect(
        await assignments.saveAdminGroupAssignments(
          admin,
          { name: "Shared", teacherIds: [a.id, b.id], revision: 3 },
          groupId,
        ),
      ).toMatchObject({ ok: false });
    });
    it("a new group's teacher cannot read historical marks or exams from an unrelated group", async () => {
      await performance.saveClassPerformance(a, sheet());
      const exam = await exams.createScheduledExam(a, {
        groupId,
        levelId,
        opensAt: new Date(Date.now() + 3600000),
        closesAt: new Date(Date.now() + 7200000),
      });
      await db().practiceSession.create({
        data: {
          instituteId: a.instituteId,
          studentId,
          levelId,
          scheduledExamId: exam.id,
          mode: "EXAM",
          status: "COMPLETED",
          totalQuestions: 2,
          correctCount: 2,
          accuracy: 100,
          passed: true,
          expiresAt: new Date(),
        },
      });
      const moved = await teachers.createGroup(outsider, "New placement");
      await db().user.update({
        where: { id: studentId },
        data: { groupId: moved.id },
      });
      expect(
        (await performance.getStudentClassPerformanceForTeacher(
          outsider,
          moved.id,
          studentId,
        ))!.rows,
      ).toEqual([]);
      expect(
        (
          await performance.getOwnClassPerformanceHistory(
            studentId,
            a.instituteId,
          )
        ).rows,
      ).toHaveLength(1);
      const progress = await teachers.getStudentProgress(
        outsider,
        moved.id,
        studentId,
      );
      expect(progress!.recentSessions).toEqual([]);
      expect(progress!.stats.completed).toBe(0);
    });
    it("concurrent assignment replacement has one winner and a clear stale-revision failure", async () => {
      const results = await Promise.all([
        assignments.saveAdminGroupAssignments(
          admin,
          { name: "A wins", teacherIds: [a.id], revision: 1 },
          groupId,
        ),
        assignments.saveAdminGroupAssignments(
          admin,
          { name: "B wins", teacherIds: [b.id], revision: 1 },
          groupId,
        ),
      ]);
      expect(results.filter((r) => r.ok)).toHaveLength(1);
      expect(results.filter((r) => !r.ok)).toHaveLength(1);
      expect(
        (await db().group.findUniqueOrThrow({ where: { id: groupId } }))
          .assignmentRevision,
      ).toBe(2);
      expect(
        await db().teacherGroupAssignment.count({ where: { groupId } }),
      ).toBe(1);
      expect(
        await db().auditLog.count({
          where: { targetId: groupId, action: "GROUP_TEACHERS_UPDATED" },
        }),
      ).toBe(2);
    });
    it("assignment revocation waits for an authorized group transaction, then denies later writes", async () => {
      const { lockTeacherGroup } = await import("@/server/group-access");
      let release!: () => void, ready!: (pid: number) => void;
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      const locked = new Promise<number>((resolve) => {
        ready = resolve;
      });
      const writing = db().$transaction(
        async (tx) => {
          await lockTeacherGroup(tx, a, groupId);
          const [{ pid }] = await tx.$queryRaw<
            Array<{ pid: number }>
          >`SELECT pg_backend_pid() AS pid`;
          ready(pid);
          await gate;
          await tx.groupLevelRule.create({
            data: { groupId, levelId, timeLimitSeconds: 90 },
          });
        },
        { timeout: 10000 },
      );
      const pid = await locked;
      const revoke = assignments.saveAdminGroupAssignments(
        admin,
        { name: "Shared", teacherIds: [b.id], revision: 1 },
        groupId,
      );
      let blocked = false;
      try {
        for (let n = 0; n < 80; n++) {
          const rows = await db().$queryRaw<
            Array<{ waiting: boolean }>
          >`SELECT EXISTS (SELECT 1 FROM pg_stat_activity WHERE ${pid} = ANY(pg_blocking_pids(pid))) AS waiting`;
          if (rows[0].waiting) {
            blocked = true;
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 20));
        }
      } finally {
        release();
      }
      await writing;
      expect(await revoke).toMatchObject({ ok: true });
      expect(blocked).toBe(true);
      expect(
        await teachers.setGroupLevelTimeRule(a, groupId, levelId, 60),
      ).toMatchObject({ ok: false });
    }, 15000);
    it("group activity includes a co-teacher's work and is revoked with membership", async () => {
      const { listTeacherAuditLogs } = await import("@/server/audit-log");
      await performance.saveClassPerformance(a, sheet());
      const logs = await listTeacherAuditLogs(b, { groupId });
      expect(
        logs.items.some((row) => row.action === "CLASS_PERFORMANCE_RECORDED"),
      ).toBe(true);
      expect(
        logs.items.some((row) => row.action === "GROUP_TEACHERS_UPDATED"),
      ).toBe(true);
      await assignments.saveAdminGroupAssignments(
        admin,
        { name: "Shared", teacherIds: [b.id], revision: 1 },
        groupId,
      );
      expect((await listTeacherAuditLogs(a)).items).toEqual([]);
    });
    it("an admin denied assignment can rename a group without changing its teachers", async () => {
      await db().userPermission.create({
        data: {
          userId: admin.id,
          permission: PERMISSIONS.GROUP_ASSIGN_TEACHER,
          effect: "DENY",
          grantedById: admin.id,
        },
      });
      expect(
        await assignments.saveAdminGroupAssignments(
          admin,
          { name: "Renamed", teacherIds: [a.id, b.id], revision: 1 },
          groupId,
        ),
      ).toMatchObject({ ok: true });
      expect(
        await assignments.saveAdminGroupAssignments(
          admin,
          { name: "Renamed", teacherIds: [a.id], revision: 2 },
          groupId,
        ),
      ).toMatchObject({ ok: false });
      expect(
        await db().teacherGroupAssignment.count({ where: { groupId } }),
      ).toBe(2);
    });
    it("keeps historical groups intact and still allows deletion of an empty unused group", async () => {
      await performance.saveClassPerformance(a, sheet());
      await db().user.update({
        where: { id: studentId },
        data: { groupId: null },
      });
      expect(await teachers.deleteGroup(b, groupId)).toMatchObject({
        ok: false,
        reason: "not-empty",
      });
      expect(
        await db().classPerformanceEntry.count({ where: { studentId } }),
      ).toBe(1);
      await assignments.saveAdminGroupAssignments(admin, {
        name: "Unused",
        teacherIds: [b.id],
      });
      const unused = await db().group.findFirstOrThrow({
        where: { instituteId: a.instituteId, name: "Unused" },
      });
      expect(await teachers.deleteGroup(b, unused.id)).toMatchObject({
        ok: true,
      });
      expect(
        await db().auditLog.count({
          where: { targetId: unused.id, action: "GROUP_TEACHERS_UPDATED" },
        }),
      ).toBe(1);
    });
    it("assignment does not bypass analytics or activity DENY overrides", async () => {
      const { listTeacherAuditLogs } = await import("@/server/audit-log");
      await db().userPermission.createMany({
        data: [PERMISSIONS.ANALYTICS_VIEW, PERMISSIONS.ACTIVITY_VIEW].map(
          (permission) => ({
            userId: b.id,
            permission,
            effect: "DENY" as const,
            grantedById: admin.id,
          }),
        ),
      });
      expect(await analytics.getGroupPracticeAnalytics(b, groupId)).toBeNull();
      await expect(analytics.getTeacherDashboardAnalytics(b)).rejects.toThrow(
        "Analytics access denied",
      );
      expect((await listTeacherAuditLogs(b)).items).toEqual([]);
      expect(await teachers.getTeacherGroup(b, groupId)).not.toBeNull();
    });
  },
);
