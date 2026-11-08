import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/lib/generated/prisma/client";
import type * as Service from "@/server/class-performance";

const context = vi.hoisted(() => ({ prisma: null as unknown as PrismaClient }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({
  get prisma() {
    return context.prisma;
  },
}));
const url = process.env.CLASS_PERFORMANCE_TEST_DATABASE_URL;

describe.skipIf(!url)(
  "Class Performance isolated PostgreSQL regression",
  () => {
    let service: typeof Service;
    let teacher: { id: string; instituteId: string };
    let groupId: string;
    let students: string[];

    beforeAll(async () => {
      const parsed = new URL(url!);
      if (
        !["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname) ||
        !/^\/swiftmath_cp_regression_\d+$/.test(parsed.pathname)
      ) {
        throw new Error(
          "Tests require a newly created, isolated local regression database.",
        );
      }
      context.prisma = new PrismaClient({
        adapter: new PrismaPg({ connectionString: url! }),
      });
      service = await import("@/server/class-performance");
      const institute = await context.prisma.institute.create({
        data: { name: "Regression", slug: randomUUID() },
      });
      const user = await context.prisma.user.create({
        data: {
          name: "Teacher",
          email: `${randomUUID()}@invalid.test`,
          role: "TEACHER",
          instituteId: institute.id,
        },
      });
      teacher = { id: user.id, instituteId: institute.id };
      const group = await context.prisma.group.create({
        data: {
          name: "Regression",
          teacherId: teacher.id,
          teacherAssignments: { create: { teacherId: teacher.id } },
          instituteId: institute.id,
        },
      });
      groupId = group.id;
      students = [];
      for (const name of ["Rafi", "Sakib"]) {
        const student = await context.prisma.user.create({
          data: {
            name,
            email: `${randomUUID()}@invalid.test`,
            role: "STUDENT",
            instituteId: institute.id,
            groupId,
          },
        });
        students.push(student.id);
      }
    });
    afterAll(async () => {
      await context.prisma?.$disconnect();
    });

    const input = (
      classDate: string,
      marks = [9, 8.5],
    ): Service.SaveClassPerformanceInput => ({
      mode: "create",
      groupId,
      classDate,
      maximumMark: "10",
      entries: students.map((studentId, index) => ({
        studentId,
        mark: String(marks[index]),
        status: "PRESENT",
      })),
    });
    const workspace = (date: string) =>
      service.getGroupClassPerformanceWorkspace(teacher, groupId, date);
    const edit = async (date: string, marks: number[]) => {
      const sheet = (await workspace(date))!;
      return {
        ...input(date, marks),
        mode: "update" as const,
        sheetId: sheet.sheetId,
        revision: sheet.revision,
      };
    };

    it("migration preserves pre-existing marks, attendance and date without fabricated history", async () => {
      const sheet = await context.prisma.classPerformance.findUniqueOrThrow({
        where: { id: "migration-sheet" },
        include: { entries: true },
      });
      expect(sheet.classDate.toISOString().slice(0, 10)).toBe("2026-10-24");
      expect(sheet.maximumMark.toString()).toBe("10");
      expect(sheet.entries[0].mark.toString()).toBe("8.5");
      expect(sheet.entries[0].status).toBe("PRESENT");
      expect(sheet.revision).toBe(1);
      expect(
        await context.prisma.classPerformanceChange.count({
          where: { sheetId: sheet.id },
        }),
      ).toBe(0);
    });

    it("25 October remains unchanged after saving 26 October; A-B-A reads load distinct marks", async () => {
      await service.saveClassPerformance(teacher, input("2026-10-25"));
      await service.saveClassPerformance(teacher, input("2026-10-26", [2, 3]));
      for (const [date, marks] of [
        ["2026-10-25", ["9", "8.5"]],
        ["2026-10-26", ["2", "3"]],
        ["2026-10-25", ["9", "8.5"]],
      ] as const) {
        expect(
          (await workspace(date))!.students.map((row) => row.mark),
        ).toEqual(marks);
      }
    });

    it("create on an existing date cannot overwrite it", async () => {
      await expect(
        service.saveClassPerformance(teacher, input("2026-10-25", [1, 1])),
      ).rejects.toThrow("already has a record");
      expect(
        (await workspace("2026-10-25"))!.students.map((row) => row.mark),
      ).toEqual(["9", "8.5"]);
    });

    it("cannot retarget an existing sheet by changing the posted date", async () => {
      const payload = await edit("2026-10-25", [1, 1]);
      await expect(
        service.saveClassPerformance(teacher, {
          ...payload,
          classDate: "2026-10-26",
        }),
      ).rejects.toThrow("does not match");
      await expect(
        service.saveClassPerformance(teacher, {
          ...payload,
          classDate: "2026-12-31",
        }),
      ).rejects.toThrow("does not match");
    });

    it("two concurrent edits from one revision yield exactly one winner and one conflict", async () => {
      const a = await edit("2026-10-26", [6, 7]);
      const b = { ...a, entries: input("2026-10-26", [4, 5]).entries };
      const results = await Promise.allSettled([
        service.saveClassPerformance(teacher, a),
        service.saveClassPerformance(teacher, b),
      ]);
      expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
      const failure = results.find(
        (r) => r.status === "rejected",
      ) as PromiseRejectedResult;
      expect(failure.reason.message).toContain("Another editor");
      const saved = (await workspace("2026-10-26"))!;
      expect(saved.revision).toBe(a.revision! + 1);
      expect([
        ["6", "7"],
        ["4", "5"],
      ]).toContainEqual(saved.students.map((row) => row.mark));
    });

    it("different-date concurrent creates and edits remain independent", async () => {
      await Promise.all([
        service.saveClassPerformance(teacher, input("2026-10-27", [1, 2])),
        service.saveClassPerformance(teacher, input("2026-10-28", [8, 9])),
      ]);
      await Promise.all([
        service.saveClassPerformance(teacher, await edit("2026-10-27", [3, 4])),
        service.saveClassPerformance(teacher, await edit("2026-10-28", [6, 7])),
      ]);
      expect(
        (await workspace("2026-10-27"))!.students.map((r) => r.mark),
      ).toEqual(["3", "4"]);
      expect(
        (await workspace("2026-10-28"))!.students.map((r) => r.mark),
      ).toEqual(["6", "7"]);
    });

    it("concurrent create requests cannot silently become updates", async () => {
      const results = await Promise.allSettled([
        service.saveClassPerformance(teacher, input("2026-10-29")),
        service.saveClassPerformance(teacher, input("2026-10-29", [1, 2])),
      ]);
      expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
      expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);
    });

    it("Teacher, Student, Admin history and ranking agree with saved marks", async () => {
      for (const load of [
        () =>
          service.getStudentClassPerformanceForTeacher(
            teacher,
            groupId,
            students[0],
          ),
        () =>
          service.getOwnClassPerformanceHistory(
            students[0],
            teacher.instituteId,
          ),
        () => service.getStudentClassPerformanceForAdmin(teacher, students[0]),
      ]) {
        const history = (await load())!;
        expect(history.rows.find((r) => r.date === "2026-10-25")).toMatchObject(
          { mark: "9", maximumMark: "10", percentage: 90, status: "PRESENT" },
        );
      }
      const ranking = (await service.getGroupClassPerformanceRanking(
        teacher,
        groupId,
        "all",
      ))!;
      const history = await service.getOwnClassPerformanceHistory(
        students[0],
        teacher.instituteId,
      );
      expect(
        ranking.rows.find((r) => r.studentId === students[0])!.percentage,
      ).toBe(history.overallPercentage);
    });

    it("records exact before/after marks, attendance, maximum, editor, date and revision", async () => {
      const payload = await edit("2026-10-25", [7, 0]);
      payload.entries[1].status = "ABSENT";
      const result = await service.saveClassPerformance(teacher, payload);
      const changes = await context.prisma.classPerformanceChange.findMany({
        where: { sheetId: result.sheetId, revision: result.revision },
      });
      expect(changes).toHaveLength(2);
      const absent = changes.find((r) => r.studentId === students[1])!;
      expect(absent.previousMark!.toString()).toBe("8.5");
      expect(absent.updatedMark.toString()).toBe("0");
      expect(absent.previousStatus).toBe("PRESENT");
      expect(absent.updatedStatus).toBe("ABSENT");
      expect(absent.editorId).toBe(teacher.id);
      expect(absent.classDate.toISOString().slice(0, 10)).toBe("2026-10-25");
      expect(absent.changedAt).toBeInstanceOf(Date);
    });

    it("rejects mutation and truncation of append-only history at database level", async () => {
      await expect(
        context.prisma.$executeRawUnsafe(
          'UPDATE class_performance_change SET "updatedMark"=0',
        ),
      ).rejects.toThrow("append-only");
      await expect(
        context.prisma.$executeRawUnsafe(
          "DELETE FROM class_performance_change",
        ),
      ).rejects.toThrow("append-only");
      await expect(
        context.prisma.$executeRawUnsafe("TRUNCATE class_performance_change"),
      ).rejects.toThrow("append-only");
    });

    it("invalid entries roll back claimed revision and leave marks/history intact", async () => {
      const payload = await edit("2026-10-25", [1000, 0]);
      const before = await context.prisma.classPerformanceChange.count();
      await expect(
        service.saveClassPerformance(teacher, payload),
      ).rejects.toThrow("between 0 and 10");
      expect((await workspace("2026-10-25"))!.revision).toBe(payload.revision);
      expect(await context.prisma.classPerformanceChange.count()).toBe(before);
    });

    it("does not bypass teacher group ownership", async () => {
      await expect(
        service.saveClassPerformance(
          { ...teacher, id: "unrelated-teacher" },
          input("2026-11-01"),
        ),
      ).rejects.toThrow("not owned");
    });

    it("audit insertion failure rolls back marks, revision and activity together", async () => {
      const payload = await edit("2026-10-28", [1, 1]);
      const before = (await workspace("2026-10-28"))!;
      const activityCount = await context.prisma.auditLog.count();
      await context.prisma.$executeRawUnsafe(
        `CREATE FUNCTION regression_reject_history_insert() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'simulated audit failure'; END; $$`,
      );
      await context.prisma.$executeRawUnsafe(
        "CREATE TRIGGER regression_reject_insert BEFORE INSERT ON class_performance_change FOR EACH STATEMENT EXECUTE FUNCTION regression_reject_history_insert()",
      );
      try {
        await expect(
          service.saveClassPerformance(teacher, payload),
        ).rejects.toThrow("simulated audit failure");
        const after = (await workspace("2026-10-28"))!;
        expect(after.revision).toBe(before.revision);
        expect(after.students).toEqual(before.students);
        expect(await context.prisma.auditLog.count()).toBe(activityCount);
      } finally {
        await context.prisma.$executeRawUnsafe(
          "DROP TRIGGER regression_reject_insert ON class_performance_change",
        );
        await context.prisma.$executeRawUnsafe(
          "DROP FUNCTION regression_reject_history_insert()",
        );
      }
    });

    it("maximum-only changes are audited and weighted ranking still uses each date's maximum", async () => {
      const created = await service.saveClassPerformance(
        teacher,
        input("2026-10-30", [9, 8]),
      );
      const payload = await edit("2026-10-30", [9, 8]);
      payload.maximumMark = "100";
      const updated = await service.saveClassPerformance(teacher, payload);
      const changes = await context.prisma.classPerformanceChange.findMany({
        where: { sheetId: created.sheetId, revision: updated.revision },
      });
      expect(changes).toHaveLength(2);
      expect(changes[0].previousMaximumMark!.toString()).toBe("10");
      expect(changes[0].updatedMaximumMark.toString()).toBe("100");
      const history = await service.getOwnClassPerformanceHistory(
        students[0],
        teacher.instituteId,
      );
      expect(
        history.rows.find((r) => r.date === "2026-10-30")!.percentage,
      ).toBe(9);
      const ranking = (await service.getGroupClassPerformanceRanking(
        teacher,
        groupId,
        "all",
      ))!;
      const row = ranking.rows.find((r) => r.studentId === students[0])!;
      const expectedMaximum = history.rows.reduce(
        (sum, r) => sum + Number(r.maximumMark),
        0,
      );
      const expectedMark = history.rows.reduce(
        (sum, r) => sum + Number(r.mark),
        0,
      );
      expect(row.totalMaximumMark).toBe(expectedMaximum);
      expect(row.totalMark).toBe(expectedMark);
      expect(row.percentage).toBe(
        Math.round((expectedMark / expectedMaximum) * 10000) / 100,
      );
    });

    it("adding a student does not backfill or alter old saved entries", async () => {
      const before = (await workspace("2026-10-25"))!;
      const newcomer = await context.prisma.user.create({
        data: {
          name: "New student",
          email: `${randomUUID()}@invalid.test`,
          role: "STUDENT",
          instituteId: teacher.instituteId,
          groupId,
        },
      });
      const fresh = (await workspace("2026-10-25"))!;
      expect(fresh.students.find((r) => r.id === newcomer.id)!.status).toBe(
        "NOT_ENTERED",
      );
      await service.saveClassPerformance(teacher, {
        mode: "update",
        sheetId: fresh.sheetId,
        revision: fresh.revision,
        groupId,
        classDate: fresh.selectedDate,
        maximumMark: fresh.maximumMark,
        entries: fresh.students.map((r) => ({
          studentId: r.id,
          mark: r.mark,
          status: r.status,
        })),
      });
      const saved = (await workspace("2026-10-25"))!;
      expect(saved.students.filter((r) => r.id !== newcomer.id)).toEqual(
        before.students,
      );
      expect(
        await context.prisma.classPerformanceEntry.count({
          where: { studentId: newcomer.id },
        }),
      ).toBe(0);
    });
  },
);
