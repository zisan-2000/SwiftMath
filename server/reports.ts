import "server-only";

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";
import type { Role } from "@/lib/generated/prisma/enums";
import {
  classDateKey,
  parseClassDate,
  todayInDhaka,
} from "@/lib/class-performance";
import {
  homeworkReportStatus,
  ReportError,
  reportTimestampRange,
  type ReportFilters,
  type ReportRow,
} from "@/lib/reports";

export type ReportActor = { id: string; instituteId: string; role: Role };
export const MAX_REPORT_ROWS = 5000;
function assertActor(actor: ReportActor) {
  if (actor.role !== "ADMIN" && actor.role !== "TEACHER")
    throw new ReportError(
      "Reports are available to teachers and institute admins only.",
    );
}
function groupScope(actor: ReportActor): Prisma.GroupWhereInput {
  return {
    instituteId: actor.instituteId,
    ...(actor.role === "TEACHER" ? { teacherId: actor.id } : {}),
  };
}
function studentScope(actor: ReportActor): Prisma.UserWhereInput {
  return {
    instituteId: actor.instituteId,
    role: "STUDENT",
    ...(actor.role === "TEACHER"
      ? {
          OR: [
            { group: { teacherId: actor.id, instituteId: actor.instituteId } },
            {
              classPerformanceEntries: {
                some: {
                  classPerformance: {
                    instituteId: actor.instituteId,
                    group: { teacherId: actor.id },
                  },
                },
              },
            },
            {
              homeworkExpectations: {
                some: {
                  occurrence: {
                    schedule: {
                      instituteId: actor.instituteId,
                      createdById: actor.id,
                    },
                  },
                },
              },
            },
            {
              practiceSessions: {
                some: {
                  scheduledExam: {
                    instituteId: actor.instituteId,
                    createdById: actor.id,
                  },
                },
              },
            },
          ],
        }
      : {}),
  };
}

/** Recheck current access without re-querying marks or replacing a preview snapshot. */
export async function validateReportExportScope(
  actor: ReportActor,
  filters: ReportFilters,
) {
  assertActor(actor);
  const target =
    filters.scope === "group"
      ? await prisma.group.findFirst({
          where: { AND: [groupScope(actor), { id: filters.groupId }] },
          select: { id: true },
        })
      : await prisma.user.findFirst({
          where: { AND: [studentScope(actor), { id: filters.studentId }] },
          select: { id: true },
        });
  if (!target)
    throw new ReportError(
      "Your access to this report has changed. Regenerate it before exporting.",
    );
}
export async function getReportOptions(actor: ReportActor) {
  assertActor(actor);
  const [groups, students, levels] = await Promise.all([
    prisma.group.findMany({
      where: groupScope(actor),
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.user.findMany({
      where: studentScope(actor),
      orderBy: { name: "asc" },
      select: { id: true, name: true, contactNumber: true, groupId: true },
    }),
    prisma.level.findMany({
      where: { instituteId: actor.instituteId },
      orderBy: { orderIndex: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  const ownedGroups = new Set(groups.map((group) => group.id));
  return {
    groups,
    students: students.map((student) =>
      actor.role === "TEACHER" && !ownedGroups.has(student.groupId ?? "")
        ? { ...student, contactNumber: null, groupId: null }
        : student,
    ),
    levels,
  };
}

/** Independent read-only adapters; never call the homework occurrence generator. */
export async function buildPerformanceReport(
  actor: ReportActor,
  filters: ReportFilters,
  now = new Date(),
) {
  assertActor(actor);
  return prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SET TRANSACTION READ ONLY`;
      const group =
        filters.scope === "group"
          ? await tx.group.findFirst({
              where: { AND: [groupScope(actor), { id: filters.groupId }] },
              select: { id: true, name: true },
            })
          : null;
      const student =
        filters.scope === "student"
          ? await tx.user.findFirst({
              where: { AND: [studentScope(actor), { id: filters.studentId }] },
              select: { id: true, name: true },
            })
          : null;
      if (
        (filters.scope === "group" && !group) ||
        (filters.scope === "student" && !student)
      )
        throw new ReportError(
          "The selected group or student is not available to you.",
        );
      const level = filters.levelId
        ? await tx.level.findFirst({
            where: { id: filters.levelId, instituteId: actor.instituteId },
            select: { id: true, name: true },
          })
        : null;
      if (filters.levelId && !level)
        throw new ReportError("Choose a sub-level from your institute.");
      const institute = await tx.institute.findUniqueOrThrow({
        where: { id: actor.instituteId },
        select: { name: true, logoUrl: true },
      });
      const subjects = student
        ? [student]
        : await tx.user.findMany({
            where: {
              instituteId: actor.instituteId,
              role: "STUDENT",
              groupId: group!.id,
            },
            select: { id: true, name: true },
            orderBy: { name: "asc" },
          });
      const range = reportTimestampRange(filters);
      const rows: ReportRow[] = [];
      let fetched = 0;
      function checkLimit(count: number) {
        fetched += count;
        if (fetched > MAX_REPORT_ROWS)
          throw new ReportError(
            `This report exceeds ${MAX_REPORT_ROWS} records. Choose a smaller date range or an individual student. No partial report was generated.`,
          );
      }
      if (filters.modules.includes("class")) {
        const entries = await tx.classPerformanceEntry.findMany({
          where: {
            instituteId: actor.instituteId,
            ...(student ? { studentId: student.id } : {}),
            classPerformance: {
              instituteId: actor.instituteId,
              ...(group ? { groupId: group.id } : {}),
              ...(actor.role === "TEACHER"
                ? { group: { teacherId: actor.id } }
                : {}),
              classDate: {
                gte: parseClassDate(filters.from)!,
                lte: parseClassDate(filters.to)!,
              },
            },
          },
          take: MAX_REPORT_ROWS + 1,
          select: {
            id: true,
            studentId: true,
            mark: true,
            status: true,
            student: { select: { name: true } },
            classPerformance: {
              select: {
                classDate: true,
                maximumMark: true,
                group: { select: { name: true } },
              },
            },
          },
        });
        checkLimit(entries.length);
        rows.push(
          ...entries.map(
            (entry): ReportRow => ({
              id: entry.id,
              module: "class",
              studentId: entry.studentId,
              student: entry.student.name,
              date: classDateKey(entry.classPerformance.classDate),
              group: entry.classPerformance.group.name,
              label: "Class performance",
              status: entry.status,
              mark: Number(entry.mark),
              maximum: Number(entry.classPerformance.maximumMark),
            }),
          ),
        );
      }
      if (filters.modules.includes("homework")) {
        const expectations = await tx.homeworkExpectation.findMany({
          where: {
            instituteId: actor.instituteId,
            ...(student ? { studentId: student.id } : {}),
            occurrence: {
              instituteId: actor.instituteId,
              cancelledAt: null,
              dueAt: range,
              schedule: {
                instituteId: actor.instituteId,
                ...(actor.role === "TEACHER" ? { createdById: actor.id } : {}),
                ...(group ? { groupId: group.id } : {}),
              },
            },
          },
          take: MAX_REPORT_ROWS + 1,
          select: {
            id: true,
            studentId: true,
            academicLevelNameSnapshot: true,
            student: { select: { name: true } },
            occurrence: {
              select: {
                opensAt: true,
                dueAt: true,
                maxScoreSnapshot: true,
                schedule: {
                  select: {
                    title: true,
                    status: true,
                    group: { select: { name: true } },
                  },
                },
              },
            },
            submissions: {
              orderBy: { attemptNumber: "desc" },
              take: 1,
              select: {
                attemptNumber: true,
                pageNumber: true,
                status: true,
                score: true,
                submittedAt: true,
                isLate: true,
                completionSeconds: true,
                teacherComment: true,
              },
            },
          },
        });
        checkLimit(expectations.length);
        for (const expectation of expectations) {
          const latest = expectation.submissions[0];
          const status = homeworkReportStatus(
            latest?.status,
            expectation.occurrence.opensAt,
            expectation.occurrence.dueAt,
            now,
          );
          if (filters.homeworkStatus && status !== filters.homeworkStatus)
            continue;
          if (
            filters.page &&
            !latest?.pageNumber
              .toLocaleLowerCase()
              .includes(filters.page.toLocaleLowerCase())
          )
            continue;
          if (filters.timing === "late" && !latest?.isLate) continue;
          if (
            filters.timing === "on-time" &&
            (!latest?.submittedAt || latest.isLate)
          )
            continue;
          const graded = latest?.status === "APPROVED" && latest.score !== null;
          rows.push({
            id: expectation.id,
            module: "homework",
            studentId: expectation.studentId,
            student: expectation.student.name,
            date: todayInDhaka(expectation.occurrence.dueAt),
            group:
              expectation.occurrence.schedule.group?.name ??
              "Individual assignment (historical group unavailable)",
            label: `${expectation.occurrence.schedule.title}${expectation.occurrence.schedule.status === "ARCHIVED" ? " [Archived]" : ""}`,
            status,
            mark: graded ? Number(latest.score) : null,
            maximum: graded
              ? Number(expectation.occurrence.maxScoreSnapshot)
              : null,
            page: latest?.pageNumber,
            attempt: latest?.attemptNumber,
            timing: latest?.submittedAt
              ? latest.isLate
                ? "Late"
                : "On time"
              : "Not submitted",
            durationSeconds: latest?.completionSeconds,
            comment: latest?.teacherComment ?? undefined,
            academicLevel: expectation.academicLevelNameSnapshot ?? undefined,
          });
        }
      }
      for (const section of ["exam", "practice"] as const) {
        if (!filters.modules.includes(section)) continue;
        const sessions = await tx.practiceSession.findMany({
          where: {
            instituteId: actor.instituteId,
            status: { not: "IN_PROGRESS" },
            submittedAt: range,
            ...(student ? { studentId: student.id } : {}),
            ...(filters.levelId ? { levelId: filters.levelId } : {}),
            mode:
              section === "exam"
                ? "EXAM"
                : filters.practiceMode || { not: "EXAM" },
            ...(section === "exam"
              ? {
                  scheduledExam: {
                    instituteId: actor.instituteId,
                    ...(group ? { groupId: group.id } : {}),
                    ...(actor.role === "TEACHER"
                      ? { createdById: actor.id }
                      : {}),
                  },
                }
              : {
                  student: {
                    instituteId: actor.instituteId,
                    ...(group ? { groupId: group.id } : {}),
                    ...(actor.role === "TEACHER"
                      ? { group: { teacherId: actor.id } }
                      : {}),
                  },
                }),
          },
          take: MAX_REPORT_ROWS + 1,
          select: {
            id: true,
            studentId: true,
            submittedAt: true,
            startedAt: true,
            totalQuestions: true,
            correctCount: true,
            passed: true,
            mode: true,
            level: { select: { name: true } },
            student: {
              select: { name: true, group: { select: { name: true } } },
            },
            scheduledExam: {
              select: { title: true, group: { select: { name: true } } },
            },
          },
        });
        checkLimit(sessions.length);
        rows.push(
          ...sessions.map(
            (session): ReportRow => ({
              id: session.id,
              module: section,
              studentId: session.studentId,
              student: session.student.name,
              date: todayInDhaka(session.submittedAt!),
              group:
                section === "exam"
                  ? session.scheduledExam!.group.name
                  : `${session.student.group?.name ?? "Unassigned"} (current group)`,
              label: `${section === "exam" ? session.scheduledExam?.title || "Exam" : session.mode} · ${session.level.name}`,
              status: session.passed ? "PASSED" : "FAILED",
              mark: session.correctCount,
              maximum: session.totalQuestions,
              durationSeconds: Math.max(
                0,
                Math.floor(
                  (session.submittedAt!.getTime() -
                    session.startedAt.getTime()) /
                    1000,
                ),
              ),
            }),
          ),
        );
      }
      const allSubjects = new Map(
        subjects.map((subject) => [subject.id, subject]),
      );
      for (const row of rows)
        allSubjects.set(row.studentId, {
          id: row.studentId,
          name: row.student,
        });
      rows.sort(
        (a, b) =>
          a.date.localeCompare(b.date) ||
          a.student.localeCompare(b.student) ||
          a.module.localeCompare(b.module) ||
          a.id.localeCompare(b.id),
      );
      return {
        filters,
        rows,
        subjects: [...allSubjects.values()].sort((a, b) =>
          a.name.localeCompare(b.name),
        ),
        institute,
        subject: group?.name ?? student!.name,
        generatedAt: now.toISOString(),
        levelName: level?.name ?? null,
      };
    },
    { isolationLevel: "RepeatableRead", timeout: 30_000 },
  );
}
export type PerformanceReport = Awaited<
  ReturnType<typeof buildPerformanceReport>
>;
