import "server-only";

import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/generated/prisma/enums";
import { rowsToCsv, slugifyFilename } from "@/lib/csv";
import { formatSpeedDuration } from "@/lib/practice-speed";
import { loadStudentProgress } from "@/server/student-progress";
import type { AdminContext } from "@/server/admin";

/** One row in the institute-wide student progress CSV. */
export type InstituteStudentReportRow = {
  name: string;
  email: string;
  group: string;
  teacher: string;
  currentLevel: string;
  active: string;
  attempts: number;
  passed: number;
  retries: number;
  retriesAtCurrentLevel: string;
  avgAccuracy: number;
  bestAccuracy: number;
  levelUps: number;
  fastestPass: string;
  avgPassTime: string;
};

const REPORT_HEADERS = [
  "Student name",
  "Email",
  "Group",
  "Teacher",
  "Current level",
  "Active",
  "Attempts",
  "Passed",
  "Retries",
  "Retries at current level",
  "Avg accuracy %",
  "Best accuracy %",
  "Level ups",
  "Fastest pass",
  "Avg pass time",
] as const;

/** Load progress metrics for every student in the admin's institute. */
export async function buildInstituteStudentReport(
  admin: AdminContext,
): Promise<InstituteStudentReportRow[]> {
  const students = await prisma.user.findMany({
    where: { instituteId: admin.instituteId, role: Role.STUDENT },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      isActive: true,
      group: {
        select: {
          name: true,
          teacher: { select: { name: true } },
        },
      },
      currentLevel: { select: { id: true, name: true, orderIndex: true } },
    },
  });

  const progressList = await Promise.all(
    students.map((student) =>
      loadStudentProgress({
        id: student.id,
        name: student.name,
        email: student.email,
        currentLevel: student.currentLevel,
      }),
    ),
  );

  return students.map((student, index) => {
    const { stats } = progressList[index]!;
    const speed = stats.speedAtCurrentLevel ?? stats.speedAll;
    const retriesAtCurrentLevel =
      stats.retryCount.atCurrentLevel == null
        ? "—"
        : String(stats.retryCount.atCurrentLevel);

    return {
      name: student.name,
      email: student.email,
      group: student.group?.name ?? "Unassigned",
      teacher: student.group?.teacher.name ?? "—",
      currentLevel: student.currentLevel
        ? `${student.currentLevel.orderIndex}. ${student.currentLevel.name}`
        : "Not assigned",
      active: student.isActive ? "Yes" : "No",
      attempts: stats.completed,
      passed: stats.passedCount,
      retries: stats.retryCount.total,
      retriesAtCurrentLevel,
      avgAccuracy: stats.avgAccuracy,
      bestAccuracy: stats.bestAccuracy,
      levelUps: stats.leveledUpCount,
      fastestPass: formatSpeedDuration(speed.fastestPassMs),
      avgPassTime: formatSpeedDuration(speed.avgPassMs),
    };
  });
}

/** Serialize the institute report to a CSV string. */
export function instituteStudentReportToCsv(
  rows: InstituteStudentReportRow[],
): string {
  return rowsToCsv(
    [...REPORT_HEADERS],
    rows.map((row) => [
      row.name,
      row.email,
      row.group,
      row.teacher,
      row.currentLevel,
      row.active,
      row.attempts,
      row.passed,
      row.retries,
      row.retriesAtCurrentLevel,
      row.avgAccuracy,
      row.bestAccuracy,
      row.levelUps,
      row.fastestPass,
      row.avgPassTime,
    ]),
  );
}

/** Build a dated attachment filename for the institute report. */
export function instituteStudentReportFilename(
  instituteName: string,
  exportedAt: Date = new Date(),
): string {
  const date = exportedAt.toISOString().slice(0, 10);
  return `${slugifyFilename(instituteName)}-student-report-${date}.csv`;
}
