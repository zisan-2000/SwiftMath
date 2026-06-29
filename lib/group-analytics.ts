import {
  computeAverageAccuracy,
  computePassRate,
} from "@/lib/analytics";

export interface GroupStudentSessionRow {
  studentId: string;
  passed: boolean;
  accuracy: number;
}

export interface GroupStudentPracticeSummary {
  studentId: string;
  name: string;
  sessions: number;
  passed: number;
  passRate: number;
  avgAccuracy: number;
  retries: number;
}

/** Per-student practice stats for one group over a time window. */
export function buildGroupStudentSummaries(
  students: { id: string; name: string }[],
  sessions: GroupStudentSessionRow[],
): GroupStudentPracticeSummary[] {
  const byStudent = new Map<string, { passed: boolean; accuracy: number }[]>();

  for (const session of sessions) {
    const rows = byStudent.get(session.studentId) ?? [];
    rows.push({ passed: session.passed, accuracy: session.accuracy });
    byStudent.set(session.studentId, rows);
  }

  return students.map((student) => {
    const rows = byStudent.get(student.id) ?? [];
    const passed = rows.filter((row) => row.passed).length;
    const total = rows.length;

    return {
      studentId: student.id,
      name: student.name,
      sessions: total,
      passed,
      passRate: computePassRate(passed, total),
      avgAccuracy: computeAverageAccuracy(rows.map((row) => row.accuracy)),
      retries: total - passed,
    };
  });
}
