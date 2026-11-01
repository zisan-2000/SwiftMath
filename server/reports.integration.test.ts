import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { PrismaClient } from "@/lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  parseReportFilters,
  summarizeReport,
  reportToCsv,
} from "@/lib/reports";
import type { ReportActor } from "@/server/reports";

const context = vi.hoisted(() => ({ prisma: null as unknown as PrismaClient }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({
  get prisma() {
    return context.prisma;
  },
}));
const url = process.env.CLASS_PERFORMANCE_TEST_DATABASE_URL;
describe.skipIf(!url)("Report adapters on isolated PostgreSQL", () => {
  let service: typeof import("@/server/reports");
  let teacher: ReportActor, admin: ReportActor, newTeacher: ReportActor;
  let groupId: string,
    unrelatedGroupId: string,
    studentId: string,
    movedId: string,
    emptyId: string,
    levelId: string;
  const now = new Date("2026-11-01T12:00:00Z");
  const filters = (overrides = {}) =>
    parseReportFilters({
      scope: "group",
      groupId,
      from: "2026-10-01",
      to: "2026-10-31",
      modules: ["class", "homework", "exam", "practice"],
      ...overrides,
    });
  beforeAll(async () => {
    const parsed = new URL(url!);
    if (
      !["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname) ||
      !/^\/swiftmath_cp_regression_\d+$/.test(parsed.pathname)
    )
      throw new Error("Reports require an isolated local test database.");
    const db = new PrismaClient({
      adapter: new PrismaPg({ connectionString: url! }),
    });
    context.prisma = db;
    service = await import("@/server/reports");
    const institute = await db.institute.create({
      data: { name: "Report Test", slug: randomUUID() },
    });
    const makeUser = (
      name: string,
      role: "TEACHER" | "ADMIN" | "STUDENT",
      groupId?: string,
    ) =>
      db.user.create({
        data: {
          name,
          role,
          email: `${randomUUID()}@invalid.test`,
          instituteId: institute.id,
          groupId,
        },
      });
    const old = await makeUser("Old teacher", "TEACHER"),
      next = await makeUser("New teacher", "TEACHER");
    teacher = { id: old.id, instituteId: institute.id, role: "TEACHER" };
    newTeacher = { ...teacher, id: next.id };
    admin = { ...teacher, role: "ADMIN" };
    const group = await db.group.create({
      data: { name: "Group A", teacherId: old.id, instituteId: institute.id },
    });
    groupId = group.id;
    const other = await db.group.create({
      data: { name: "Group B", teacherId: next.id, instituteId: institute.id },
    });
    unrelatedGroupId = other.id;
    const student = await makeUser("Rafi", "STUDENT", groupId);
    studentId = student.id;
    const absent = await makeUser("Absent", "STUDENT", groupId);
    emptyId = (await makeUser("No data", "STUDENT", groupId)).id;
    movedId = (await makeUser("Moved student", "STUDENT", other.id)).id;
    await db.user.update({
      where: { id: movedId },
      data: { contactNumber: "01912345678" },
    });
    const level = await db.level.create({
      data: {
        name: "Sub-level A",
        orderIndex: 1,
        instituteId: institute.id,
        questionCount: 10,
        timeLimitSeconds: 60,
        passAccuracy: 80,
        operation: "ADDITION",
        termsPerQuestion: 2,
        minNumber: 1,
        maxNumber: 10,
      },
    });
    levelId = level.id;
    for (const [date, maximum, mark] of [
      ["2026-10-25", 10, 9],
      ["2026-10-26", 100, 76],
    ] as const) {
      const sheet = await db.classPerformance.create({
        data: {
          instituteId: institute.id,
          groupId,
          classDate: new Date(date),
          maximumMark: maximum,
          createdById: old.id,
        },
      });
      await db.classPerformanceEntry.create({
        data: {
          instituteId: institute.id,
          classPerformanceId: sheet.id,
          studentId,
          mark,
          status: "PRESENT",
        },
      });
      if (maximum === 10)
        await db.classPerformanceEntry.create({
          data: {
            instituteId: institute.id,
            classPerformanceId: sheet.id,
            studentId: absent.id,
            mark: 0,
            status: "ABSENT",
          },
        });
    }
    const hw = async (
      owner: string,
      individual: boolean,
      due = "2026-10-26T17:00:00Z",
      archived = false,
    ) => {
      const schedule = await db.homeworkSchedule.create({
        data: {
          instituteId: institute.id,
          createdById: owner,
          title: individual ? "Individual task" : "Group task",
          mode: "MANUAL_SPECIFIC",
          manualOpensAt: new Date("2026-10-25T00:00:00Z"),
          manualDueAt: new Date(due),
          targetType: individual ? "STUDENT" : "GROUP",
          groupId: individual ? null : groupId,
          studentId: individual ? movedId : null,
          startDate: new Date("2026-10-25"),
          maxScore: individual ? 100 : 10,
          timeLimitMinutes: 15,
          status: archived ? "ARCHIVED" : "ACTIVE",
        },
      });
      return db.homeworkOccurrence.create({
        data: {
          instituteId: institute.id,
          scheduleId: schedule.id,
          opensAt: new Date("2026-10-25T00:00:00Z"),
          dueAt: new Date(due),
          maxScoreSnapshot: individual ? 100 : 10,
          timeLimitMinutesSnapshot: 15,
          showTimerSnapshot: true,
          allowSamePageAgainSnapshot: false,
          expectationsMaterializedAt: now,
        },
      });
    };
    const expectation = (occurrenceId: string, sid: string) =>
      db.homeworkExpectation.create({
        data: {
          occurrenceId,
          studentId: sid,
          instituteId: institute.id,
          academicLevelNameSnapshot: "Academic Level 1",
        },
      });
    const groupHw = await hw(old.id, false, undefined, true);
    const rafiHW = await expectation(groupHw.id, studentId);
    await expectation(groupHw.id, absent.id);
    await db.homeworkSubmission.create({
      data: {
        expectationId: rafiHW.id,
        attemptNumber: 1,
        pageNumber: "49",
        firstPhotoKey: "private-first",
        finalPhotoKey: "private-final",
        status: "REJECTED",
        score: 9,
      },
    });
    await db.homeworkSubmission.create({
      data: {
        expectationId: rafiHW.id,
        attemptNumber: 2,
        pageNumber: "49",
        firstPhotoKey: "private-first",
        finalPhotoKey: "private-final",
        status: "APPROVED",
        score: 8.5,
        submittedAt: new Date("2026-10-27T01:00:00Z"),
        isLate: true,
        completionSeconds: 272,
      },
    });
    for (const [owner, score] of [
      [old.id, 87],
      [next.id, 99],
    ] as const) {
      const occurrence = await hw(owner, true);
      const e = await expectation(occurrence.id, movedId);
      await db.homeworkSubmission.create({
        data: {
          expectationId: e.id,
          attemptNumber: 1,
          pageNumber: "50",
          firstPhotoKey: "private",
          status: "APPROVED",
          score,
        },
      });
    }
    const incomplete = await expectation(
      (await hw(old.id, false, "2026-10-27T17:00:00Z")).id,
      studentId,
    );
    await db.homeworkSubmission.create({
      data: {
        expectationId: incomplete.id,
        attemptNumber: 1,
        pageNumber: "51",
        firstPhotoKey: "private",
        status: "IN_PROGRESS",
      },
    });
    const pending = await expectation(
      (await hw(old.id, false, "2026-10-28T17:00:00Z")).id,
      studentId,
    );
    for (const [attemptNumber, status, score] of [
      [1, "APPROVED", 7],
      [2, "SUBMITTED", null],
    ] as const)
      await db.homeworkSubmission.create({
        data: {
          expectationId: pending.id,
          attemptNumber,
          pageNumber: "52",
          firstPhotoKey: "private",
          status,
          score,
        },
      });
    const future = await hw(old.id, false, "2026-10-30T17:00:00Z");
    await db.homeworkOccurrence.update({
      where: { id: future.id },
      data: { expectationsMaterializedAt: null },
    });
    const exam = await db.scheduledExam.create({
      data: {
        instituteId: institute.id,
        groupId,
        levelId,
        title: "Exam A",
        opensAt: new Date("2026-10-25"),
        closesAt: now,
        createdById: old.id,
      },
    });
    for (const [mode, correctCount, totalQuestions, submittedAt] of [
      ["STANDARD", 8, 10, "2026-10-25T18:00:00Z"],
      ["REVIEW", 10, 20, "2026-10-26T00:00:00Z"],
      ["EXAM", 9, 10, "2026-10-26T00:00:00Z"],
      ["CHALLENGE", 0, 10, "2026-10-31T18:00:00Z"],
    ] as const)
      await db.practiceSession.create({
        data: {
          instituteId: institute.id,
          studentId,
          levelId,
          mode,
          scheduledExamId: mode === "EXAM" ? exam.id : null,
          status: "COMPLETED",
          startedAt: new Date("2026-10-25"),
          submittedAt: new Date(submittedAt),
          expiresAt: now,
          totalQuestions,
          correctCount,
          accuracy: (correctCount / totalQuestions) * 100,
          passed: correctCount >= 8,
        },
      });
  });
  afterAll(async () => {
    await context.prisma?.$disconnect();
  });

  it("uses independent weighted class and homework scores", async () => {
    const report = await service.buildPerformanceReport(
      teacher,
      filters(),
      now,
    );
    const summary = summarizeReport(report.rows).find(
      (r) => r.module === "class" && r.studentId === studentId,
    )!;
    expect(summary).toMatchObject({
      totalMark: 85,
      totalMaximum: 110,
      percentage: 77.27,
    });
    expect(
      summarizeReport(report.rows).find(
        (r) => r.module === "homework" && r.studentId === studentId,
      ),
    ).toMatchObject({
      records: 3,
      graded: 1,
      totalMark: 8.5,
      totalMaximum: 10,
    });
  });
  it("counts latest attempts once, including derived missing/incomplete without scoring them", async () => {
    const report = await service.buildPerformanceReport(
      teacher,
      filters({ modules: ["homework"] }),
      now,
    );
    expect(report.rows).toHaveLength(4);
    expect(report.rows.filter((r) => r.status === "MISSING")).toHaveLength(1);
    expect(report.rows.filter((r) => r.status === "INCOMPLETE")).toHaveLength(
      1,
    );
    expect(report.rows.find((r) => r.page === "52")).toMatchObject({
      attempt: 2,
      mark: null,
      maximum: null,
    });
    expect(report.rows.find((r) => r.page === "49")!.label).toContain(
      "Archived",
    );
  });
  it("honors homework page, latest status and timing filters", async () => {
    const report = await service.buildPerformanceReport(
      teacher,
      filters({
        modules: ["homework"],
        page: "49",
        homeworkStatus: "APPROVED",
        timing: "late",
      }),
      now,
    );
    expect(report.rows).toHaveLength(1);
    expect(report.rows[0]).toMatchObject({
      mark: 8.5,
      timing: "Late",
      durationSeconds: 272,
    });
  });
  it("does not use submitted date for homework due-date filtering", async () => {
    const report = await service.buildPerformanceReport(
      teacher,
      filters({
        modules: ["homework"],
        from: "2026-10-26",
        to: "2026-10-26",
        page: "49",
      }),
      now,
    );
    expect(report.rows).toHaveLength(1);
    expect(report.rows[0].date).toBe("2026-10-26");
  });
  it("rejects another teacher's group and inaccessible student, even with crafted IDs", async () => {
    await expect(
      service.buildPerformanceReport(
        teacher,
        filters({ groupId: unrelatedGroupId }),
        now,
      ),
    ).rejects.toThrow("not available");
    await expect(
      service.buildPerformanceReport(
        teacher,
        filters({ scope: "student", studentId: "nonexistent" }),
        now,
      ),
    ).rejects.toThrow("not available");
    await expect(
      service.buildPerformanceReport(
        { ...teacher, role: "STUDENT" },
        filters(),
        now,
      ),
    ).rejects.toThrow("teachers");
  });
  it("retains original teacher access to individual homework after the student moved", async () => {
    const report = await service.buildPerformanceReport(
      teacher,
      filters({ scope: "student", studentId: movedId, modules: ["homework"] }),
      now,
    );
    expect(report.rows).toHaveLength(1);
    expect(report.rows[0].mark).toBe(87);
    const next = await service.buildPerformanceReport(
      newTeacher,
      filters({ scope: "student", studentId: movedId, modules: ["homework"] }),
      now,
    );
    expect(next.rows).toHaveLength(1);
    expect(next.rows[0].mark).toBe(99);
    const options = await service.getReportOptions(teacher);
    expect(options.students.some((s) => s.id === movedId)).toBe(true);
    expect(
      options.students.find((s) => s.id === movedId)!.contactNumber,
    ).toBeNull();
    expect(
      (await service.getReportOptions(newTeacher)).students.find(
        (s) => s.id === movedId,
      )!.contactNumber,
    ).toBe("01912345678");
  });
  it("admin can read institute history but cross-institute actors cannot", async () => {
    const report = await service.buildPerformanceReport(
      admin,
      filters({ scope: "student", studentId: movedId, modules: ["homework"] }),
      now,
    );
    expect(report.rows).toHaveLength(2);
    await expect(
      service.buildPerformanceReport(
        { ...admin, instituteId: "other-institute" },
        filters(),
        now,
      ),
    ).rejects.toThrow("not available");
  });
  it("separates exam/practice and respects mode, sub-level and Dhaka date boundaries", async () => {
    const report = await service.buildPerformanceReport(
      teacher,
      filters({ modules: ["exam", "practice"] }),
      now,
    );
    expect(report.rows.filter((r) => r.module === "exam")).toHaveLength(1);
    expect(report.rows.filter((r) => r.module === "practice")).toHaveLength(2);
    expect(report.rows.every((r) => r.date === "2026-10-26")).toBe(true);
    expect(
      summarizeReport(report.rows).find((r) => r.module === "practice"),
    ).toMatchObject({ totalMark: 18, totalMaximum: 30, percentage: 60 });
    const review = await service.buildPerformanceReport(
      teacher,
      filters({ modules: ["practice"], levelId, practiceMode: "REVIEW" }),
      now,
    );
    expect(review.rows).toHaveLength(1);
    expect(review.rows[0].mark).toBe(10);
  });
  it("keeps no-data students in summaries and private photos out of report data", async () => {
    const report = await service.buildPerformanceReport(
      teacher,
      filters(),
      now,
    );
    expect(
      summarizeReport(
        report.rows,
        report.subjects,
        report.filters.modules,
      ).find((s) => s.studentId === emptyId),
    ).toMatchObject({ records: 0, percentage: null });
    expect(JSON.stringify(report)).not.toContain("private-first");
    const csv = reportToCsv(
      report.rows,
      report.filters,
      report.generatedAt,
      report.subjects,
    );
    expect(csv).toContain("77.27");
    expect(csv).toContain("No data");
  });
  it("runs reports without materializing homework or altering saved data", async () => {
    const before = {
      occurrences: await context.prisma.homeworkOccurrence.count(),
      expectations: await context.prisma.homeworkExpectation.count(),
      entries: await context.prisma.classPerformanceEntry.findMany({
        orderBy: { id: "asc" },
      }),
    };
    await service.buildPerformanceReport(teacher, filters(), now);
    expect(await context.prisma.homeworkOccurrence.count()).toBe(
      before.occurrences,
    );
    expect(await context.prisma.homeworkExpectation.count()).toBe(
      before.expectations,
    );
    expect(
      await context.prisma.classPerformanceEntry.findMany({
        orderBy: { id: "asc" },
      }),
    ).toEqual(before.entries);
  });
  it("revalidates snapshot export scope for teachers, admins and historical students", async () => {
    await expect(
      service.validateReportExportScope(teacher, filters()),
    ).resolves.toBeUndefined();
    await expect(
      service.validateReportExportScope(
        admin,
        filters({ groupId: unrelatedGroupId }),
      ),
    ).resolves.toBeUndefined();
    await expect(
      service.validateReportExportScope(
        teacher,
        filters({ scope: "student", studentId: movedId }),
      ),
    ).resolves.toBeUndefined();
    await expect(
      service.validateReportExportScope(newTeacher, filters()),
    ).rejects.toThrow("access");
    await expect(
      service.validateReportExportScope(
        { ...admin, instituteId: "other" },
        filters(),
      ),
    ).rejects.toThrow("access");
    await expect(
      service.validateReportExportScope(
        { ...teacher, role: "STUDENT" },
        filters(),
      ),
    ).rejects.toThrow("teachers");
  });
  it("rejects oversized reports rather than silently exporting a partial result", async () => {
    await context.prisma.practiceSession.createMany({
      data: Array.from({ length: 5001 }, () => ({
        instituteId: teacher.instituteId,
        studentId,
        levelId,
        mode: "STANDARD" as const,
        status: "COMPLETED" as const,
        startedAt: new Date("2026-10-29"),
        submittedAt: new Date("2026-10-29T01:00:00Z"),
        expiresAt: now,
        totalQuestions: 10,
        correctCount: 8,
      })),
    });
    await expect(
      service.buildPerformanceReport(
        teacher,
        filters({ modules: ["practice"] }),
        now,
      ),
    ).rejects.toThrow("No partial report");
  }, 30_000);
});
