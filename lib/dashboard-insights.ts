import type { DailySessionCount } from "./analytics";
import type { GroupCompletionRow } from "./group-completion";

/** Presentation-only derivations from the already authorized dashboard data. */
export function practiceDaySeries(days: DailySessionCount[]) {
  return days.map((day) => ({
    ...day,
    notPassed: Math.max(0, day.sessions - day.passed),
    passRate:
      day.sessions > 0 ? Math.round((day.passed / day.sessions) * 100) : null,
  }));
}

export function teachingAttention(rows: GroupCompletionRow[]) {
  return rows
    .map((row) => ({
      ...row,
      inactive: Math.max(0, row.studentCount - row.activeStudents),
      practisingWithoutPass: Math.max(
        0,
        row.activeStudents - row.studentsPassed,
      ),
    }))
    .sort(
      (a, b) =>
        b.inactive +
          b.practisingWithoutPass -
          (a.inactive + a.practisingWithoutPass) ||
        a.groupName.localeCompare(b.groupName),
    );
}
