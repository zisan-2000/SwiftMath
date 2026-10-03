// Trusted reads and writes for teacher-entered, date-wise class performance.

import "server-only";

import { prisma } from "@/lib/prisma";
import {
  CLASS_PERFORMANCE_NOT_ENTERED,
  buildClassPerformanceRanking,
  classDateKey,
  classPerformancePeriodStart,
  formatClassDate,
  mergeClassPerformanceRoster,
  parseClassDate,
  percentage,
  todayInDhaka,
  type ClassPerformancePeriod,
  type ClassPerformanceDraftStatus,
} from "@/lib/class-performance";
import {
  AuditAction,
  ClassPerformanceStatus,
  Role,
} from "@/lib/generated/prisma/enums";
import { auditActorFromTeacher, recordAuditLog } from "@/server/audit-log";
import type { AdminContext } from "@/server/admin";
import type { TeacherContext } from "@/server/teacher";

export class ClassPerformanceError extends Error {}

export interface ClassPerformanceEntryInput {
  studentId: string;
  mark: string;
  status: ClassPerformanceDraftStatus;
}

export interface SaveClassPerformanceInput {
  groupId: string;
  classDate: string;
  maximumMark: string;
  entries: ClassPerformanceEntryInput[];
}

function decimalText(value: { toString(): string }): string {
  const text = value.toString();
  return text.includes(".") ? text.replace(/\.?0+$/, "") : text;
}

function decimalNumber(value: { toString(): string }): number {
  return Number(value.toString());
}

function parseMark(value: string, label: string): number {
  const trimmed = value.trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(trimmed)) {
    throw new ClassPerformanceError(`${label} must be a valid number with up to 2 decimal places.`);
  }
  const number = Number(trimmed);
  if (!Number.isFinite(number)) {
    throw new ClassPerformanceError(`${label} is not valid.`);
  }
  return number;
}

function summarizeSheet(sheet: {
  classDate: Date;
  maximumMark: { toString(): string };
  entries: Array<{
    mark: { toString(): string };
    status: ClassPerformanceStatus;
  }>;
}) {
  const maximumMark = decimalNumber(sheet.maximumMark);
  let totalMark = 0;
  let presentCount = 0;
  let absentCount = 0;

  for (const entry of sheet.entries) {
    totalMark += decimalNumber(entry.mark);
    if (entry.status === ClassPerformanceStatus.ABSENT) absentCount += 1;
    else presentCount += 1;
  }

  const totalMaximumMark = maximumMark * sheet.entries.length;
  return {
    date: classDateKey(sheet.classDate),
    label: formatClassDate(sheet.classDate),
    maximumMark: decimalText(sheet.maximumMark),
    averagePercentage: percentage(totalMark, totalMaximumMark),
    presentCount,
    absentCount,
    studentCount: sheet.entries.length,
  };
}

/** Group roster, selected date sheet, and complete date-wise history. */
export async function getGroupClassPerformanceWorkspace(
  teacher: TeacherContext,
  groupId: string,
  requestedDate?: string,
) {
  const selectedDate =
    requestedDate && parseClassDate(requestedDate)
      ? requestedDate
      : todayInDhaka();
  const date = parseClassDate(selectedDate)!;

  const group = await prisma.group.findFirst({
    where: {
      id: groupId,
      teacherId: teacher.id,
      instituteId: teacher.instituteId,
    },
    select: {
      id: true,
      students: {
        where: { role: Role.STUDENT },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      },
    },
  });
  if (!group) return null;

  const [selected, historyRows] = await Promise.all([
    prisma.classPerformance.findUnique({
      where: { groupId_classDate: { groupId, classDate: date } },
      select: {
        maximumMark: true,
        entries: {
          orderBy: { student: { name: "asc" } },
          select: {
            studentId: true,
            mark: true,
            status: true,
            student: { select: { name: true } },
          },
        },
      },
    }),
    prisma.classPerformance.findMany({
      where: { groupId, instituteId: teacher.instituteId },
      orderBy: { classDate: "desc" },
      select: {
        classDate: true,
        maximumMark: true,
        entries: { select: { mark: true, status: true } },
      },
    }),
  ]);

  const students = selected
    ? mergeClassPerformanceRoster(
        group.students,
        selected.entries.map((entry) => ({
          id: entry.studentId,
          name: entry.student.name,
          mark: decimalText(entry.mark),
          status: entry.status,
        })),
      )
    : group.students.map((student) => ({
        ...student,
        mark: "0",
        status: ClassPerformanceStatus.PRESENT,
        canBeNotEntered: false,
      }));

  return {
    selectedDate,
    isExisting: selected != null,
    maximumMark: selected ? decimalText(selected.maximumMark) : "10",
    students,
    history: historyRows.map(summarizeSheet),
  };
}

/** Create or update a complete class sheet for the teacher's current group roster. */
export async function saveClassPerformance(
  teacher: TeacherContext,
  input: SaveClassPerformanceInput,
): Promise<{ created: boolean }> {
  const classDate = parseClassDate(input.classDate);
  if (!classDate) {
    throw new ClassPerformanceError("Choose a valid class date.");
  }

  const maximumMark = parseMark(input.maximumMark, "Maximum mark");
  if (maximumMark <= 0 || maximumMark > 999_999.99) {
    throw new ClassPerformanceError("Maximum mark must be greater than 0.");
  }

  const group = await prisma.group.findFirst({
    where: {
      id: input.groupId,
      teacherId: teacher.id,
      instituteId: teacher.instituteId,
    },
    select: {
      id: true,
      name: true,
      students: {
        where: { role: Role.STUDENT },
        select: { id: true, name: true },
      },
    },
  });
  if (!group) {
    throw new ClassPerformanceError("Group not found or not owned by you.");
  }

  const existing = await prisma.classPerformance.findUnique({
    where: {
      groupId_classDate: { groupId: input.groupId, classDate },
    },
    select: {
      id: true,
      entries: {
        select: {
          studentId: true,
          mark: true,
          status: true,
          student: { select: { name: true } },
        },
      },
    },
  });

  if (
    existing?.entries.some(
      (entry) => decimalNumber(entry.mark) > maximumMark,
    )
  ) {
    throw new ClassPerformanceError(
      "Maximum mark cannot be lower than a mark already saved on this class.",
    );
  }

  const authoritativeRoster = existing
    ? mergeClassPerformanceRoster(
        group.students,
        existing.entries.map((entry) => ({
          id: entry.studentId,
          name: entry.student.name,
          mark: decimalText(entry.mark),
          status: entry.status,
        })),
      )
    : group.students;
  const expectedIds = new Set(authoritativeRoster.map((student) => student.id));
  const receivedIds = new Set(input.entries.map((entry) => entry.studentId));
  if (
    expectedIds.size !== receivedIds.size ||
    input.entries.length !== receivedIds.size ||
    [...expectedIds].some((id) => !receivedIds.has(id))
  ) {
    throw new ClassPerformanceError(
      "The submitted student list no longer matches this class record. Refresh and try again.",
    );
  }

  const studentNames = new Map(
    authoritativeRoster.map((student) => [student.id, student.name]),
  );
  const savedStudentIds = new Set(
    existing?.entries.map((entry) => entry.studentId) ?? [],
  );
  const entries = input.entries.flatMap((entry) => {
    if (entry.status === CLASS_PERFORMANCE_NOT_ENTERED) {
      if (!existing || savedStudentIds.has(entry.studentId)) {
        throw new ClassPerformanceError(
          "Only a newly added student can remain Not entered on an existing class record.",
        );
      }
      return [];
    }
    if (
      entry.status !== ClassPerformanceStatus.PRESENT &&
      entry.status !== ClassPerformanceStatus.ABSENT
    ) {
      throw new ClassPerformanceError("Choose a valid attendance status.");
    }
    const name = studentNames.get(entry.studentId) ?? "Student";
    const mark =
      entry.status === ClassPerformanceStatus.ABSENT
        ? 0
        : parseMark(entry.mark, `${name}'s mark`);
    if (mark < 0 || mark > maximumMark) {
      throw new ClassPerformanceError(
        `${name}'s mark must be between 0 and ${maximumMark}.`,
      );
    }
    return [{ studentId: entry.studentId, mark, status: entry.status }];
  });

  const savedSheetId = await prisma.$transaction(async (tx) => {
    const sheet = await tx.classPerformance.upsert({
      where: {
        groupId_classDate: { groupId: input.groupId, classDate },
      },
      create: {
        instituteId: teacher.instituteId,
        groupId: input.groupId,
        classDate,
        maximumMark,
        createdById: teacher.id,
      },
      update: { maximumMark },
      select: { id: true },
    });

    for (const entry of entries) {
      await tx.classPerformanceEntry.upsert({
        where: {
          classPerformanceId_studentId: {
            classPerformanceId: sheet.id,
            studentId: entry.studentId,
          },
        },
        create: {
          instituteId: teacher.instituteId,
          classPerformanceId: sheet.id,
          studentId: entry.studentId,
          mark: entry.mark,
          status: entry.status,
        },
        update: { mark: entry.mark, status: entry.status },
      });
    }
    return sheet.id;
  });

  const created = existing == null;
  await recordAuditLog({
    actor: auditActorFromTeacher(teacher),
    action: created
      ? AuditAction.CLASS_PERFORMANCE_RECORDED
      : AuditAction.CLASS_PERFORMANCE_UPDATED,
    targetType: "ClassPerformance",
    targetId: savedSheetId,
    summary: `${created ? "Recorded" : "Updated"} ${group.name} class performance for ${formatClassDate(classDate)} (${maximumMark} marks).`,
    metadata: { groupId: input.groupId, classDate: input.classDate },
  });

  return { created };
}

/** A ranking sourced only from teacher-entered class marks. */
export async function getGroupClassPerformanceRanking(
  teacher: TeacherContext,
  groupId: string,
  period: ClassPerformancePeriod,
) {
  const group = await prisma.group.findFirst({
    where: {
      id: groupId,
      teacherId: teacher.id,
      instituteId: teacher.instituteId,
    },
    select: {
      students: {
        where: { role: Role.STUDENT },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      },
    },
  });
  if (!group) return null;

  const start = classPerformancePeriodStart(period);
  const sheets = await prisma.classPerformance.findMany({
    where: {
      groupId,
      instituteId: teacher.instituteId,
      ...(start ? { classDate: { gte: start } } : {}),
    },
    select: {
      maximumMark: true,
      entries: {
        select: { studentId: true, mark: true, status: true },
      },
    },
  });

  return {
    classCount: sheets.length,
    rows: buildClassPerformanceRanking(
      group.students,
      sheets.map((sheet) => ({
        maximumMark: decimalNumber(sheet.maximumMark),
        entries: sheet.entries.map((entry) => ({
          studentId: entry.studentId,
          mark: decimalNumber(entry.mark),
          status: entry.status,
        })),
      })),
    ),
  };
}

async function loadStudentClassPerformanceHistory(studentId: string) {
  const entries = await prisma.classPerformanceEntry.findMany({
    where: { studentId },
    orderBy: { classPerformance: { classDate: "desc" } },
    select: {
      mark: true,
      status: true,
      classPerformance: {
        select: {
          classDate: true,
          maximumMark: true,
          group: { select: { name: true } },
        },
      },
    },
  });

  let totalMark = 0;
  let totalMaximumMark = 0;
  const rows = entries.map((entry) => {
    const mark = decimalNumber(entry.mark);
    const maximumMark = decimalNumber(entry.classPerformance.maximumMark);
    totalMark += mark;
    totalMaximumMark += maximumMark;
    return {
      date: classDateKey(entry.classPerformance.classDate),
      label: formatClassDate(entry.classPerformance.classDate),
      groupName: entry.classPerformance.group.name,
      mark: decimalText(entry.mark),
      maximumMark: decimalText(entry.classPerformance.maximumMark),
      percentage: percentage(mark, maximumMark),
      status: entry.status,
    };
  });

  return {
    rows,
    classCount: rows.length,
    absentCount: rows.filter((row) => row.status === ClassPerformanceStatus.ABSENT)
      .length,
    overallPercentage: percentage(totalMark, totalMaximumMark),
  };
}

export async function getStudentClassPerformanceForTeacher(
  teacher: TeacherContext,
  groupId: string,
  studentId: string,
) {
  const student = await prisma.user.findFirst({
    where: {
      id: studentId,
      role: Role.STUDENT,
      groupId,
      group: { teacherId: teacher.id },
    },
    select: { id: true },
  });
  if (!student) return null;
  return loadStudentClassPerformanceHistory(student.id);
}

export async function getOwnClassPerformanceHistory(
  studentId: string,
  instituteId: string,
) {
  const student = await prisma.user.findFirst({
    where: { id: studentId, instituteId, role: Role.STUDENT },
    select: { id: true },
  });
  if (!student) return { rows: [], classCount: 0, absentCount: 0, overallPercentage: 0 };
  return loadStudentClassPerformanceHistory(student.id);
}

export async function getStudentClassPerformanceForAdmin(
  admin: AdminContext,
  studentId: string,
) {
  const student = await prisma.user.findFirst({
    where: {
      id: studentId,
      instituteId: admin.instituteId,
      role: Role.STUDENT,
    },
    select: { id: true },
  });
  if (!student) return null;
  return loadStudentClassPerformanceHistory(student.id);
}
