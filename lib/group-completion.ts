import { computeAverageAccuracy, computePassRate } from "@/lib/analytics";

export interface GroupCompletionRow {
  groupId: string;
  groupName: string;
  studentCount: number;
  /** Students with at least one finished attempt in the window. */
  activeStudents: number;
  /** Students with at least one passed attempt in the window. */
  studentsPassed: number;
  /** Share of enrolled students who passed at least once. */
  studentCompletionRate: number;
  sessions: number;
  passed: number;
  /** Share of finished attempts that passed (attempt completion rate). */
  attemptCompletionRate: number;
  avgAccuracy: number;
}

export interface GroupCompletionSessionRow {
  studentId: string;
  groupId: string;
  passed: boolean;
  accuracy: number;
}

/** Per-group completion stats for a teacher dashboard breakdown. */
export function buildGroupCompletionRows(
  groups: { id: string; name: string; studentCount: number }[],
  sessions: GroupCompletionSessionRow[],
): GroupCompletionRow[] {
  const sessionsByGroup = new Map<string, GroupCompletionSessionRow[]>();
  for (const session of sessions) {
    const rows = sessionsByGroup.get(session.groupId) ?? [];
    rows.push(session);
    sessionsByGroup.set(session.groupId, rows);
  }

  return groups.map((group) => {
    const rows = sessionsByGroup.get(group.id) ?? [];
    const passed = rows.filter((row) => row.passed).length;
    const activeStudentIds = new Set(rows.map((row) => row.studentId));
    const passedStudentIds = new Set(
      rows.filter((row) => row.passed).map((row) => row.studentId),
    );

    return {
      groupId: group.id,
      groupName: group.name,
      studentCount: group.studentCount,
      activeStudents: activeStudentIds.size,
      studentsPassed: passedStudentIds.size,
      studentCompletionRate: computePassRate(
        passedStudentIds.size,
        group.studentCount,
      ),
      sessions: rows.length,
      passed,
      attemptCompletionRate: computePassRate(passed, rows.length),
      avgAccuracy: computeAverageAccuracy(rows.map((row) => row.accuracy)),
    };
  });
}
