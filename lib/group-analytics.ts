import {
  computeAverageAccuracy,
  computePassRate,
} from "@/lib/analytics";
import { buildSpeedSummary, type SpeedSummary, type TimedSessionRow } from "@/lib/practice-speed";

export interface GroupStudentSessionRow {
  studentId: string;
  passed: boolean;
  accuracy: number;
  startedAt: Date;
  submittedAt: Date | null;
}

export interface GroupStudentPracticeSummary {
  studentId: string;
  name: string;
  sessions: number;
  passed: number;
  passRate: number;
  avgAccuracy: number;
  retries: number;
  avgPassMs: number | null;
  fastestPassMs: number | null;
}

/** Per-student practice stats for one group over a time window. */
export function buildGroupStudentSummaries(
  students: { id: string; name: string }[],
  sessions: GroupStudentSessionRow[],
): GroupStudentPracticeSummary[] {
  const byStudent = new Map<string, GroupStudentSessionRow[]>();

  for (const session of sessions) {
    const rows = byStudent.get(session.studentId) ?? [];
    rows.push(session);
    byStudent.set(session.studentId, rows);
  }

  return students.map((student) => {
    const rows = byStudent.get(student.id) ?? [];
    const passed = rows.filter((row) => row.passed).length;
    const total = rows.length;
    const speed = buildSpeedSummary(rows);

    return {
      studentId: student.id,
      name: student.name,
      sessions: total,
      passed,
      passRate: computePassRate(passed, total),
      avgAccuracy: computeAverageAccuracy(rows.map((row) => row.accuracy)),
      retries: total - passed,
      avgPassMs: speed.avgPassMs,
      fastestPassMs: speed.fastestPassMs,
    };
  });
}

/** Group-wide speed stats from timed session rows. */
export function buildGroupSpeedSummary(
  sessions: TimedSessionRow[],
): SpeedSummary {
  return buildSpeedSummary(sessions);
}
