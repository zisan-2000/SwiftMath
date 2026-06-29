import {
  buildDailySessionCounts,
  computeAverageAccuracy,
  computePassRate,
} from "@/lib/analytics";

/** One day on the teacher progress trend chart. */
export interface DailyProgressPoint {
  date: string;
  label: string;
  sessions: number;
  passRate: number;
  avgAccuracy: number;
}

/** One group on the teacher comparison chart. */
export interface GroupComparisonPoint {
  groupId: string;
  groupName: string;
  sessions: number;
  passRate: number;
}

export interface GroupComparisonSessionRow {
  groupId: string;
  passed: boolean;
  accuracy: number;
  createdAt: Date;
}

/** Daily pass-rate and accuracy trend for the teacher progress chart. */
export function buildDailyProgressTrend(
  sessions: { createdAt: Date; passed: boolean; accuracy: number }[],
  days: number,
  now: Date = new Date(),
): DailyProgressPoint[] {
  const daily = buildDailySessionCounts(sessions, days, now);
  const byDate = new Map<
    string,
    { passed: boolean; accuracy: number }[]
  >();

  for (const session of sessions) {
    const key = toDateKey(session.createdAt);
    const rows = byDate.get(key) ?? [];
    rows.push({ passed: session.passed, accuracy: session.accuracy });
    byDate.set(key, rows);
  }

  return daily.map((bucket) => {
    const rows = byDate.get(bucket.date) ?? [];
    const passed = rows.filter((row) => row.passed).length;
    return {
      date: bucket.date,
      label: bucket.label,
      sessions: bucket.sessions,
      passRate: computePassRate(passed, rows.length),
      avgAccuracy: computeAverageAccuracy(rows.map((row) => row.accuracy)),
    };
  });
}

/** Per-group session and completion stats for the comparison chart. */
export function buildGroupComparisonPoints(
  groups: { id: string; name: string }[],
  sessions: GroupComparisonSessionRow[],
): GroupComparisonPoint[] {
  const byGroup = new Map<string, GroupComparisonSessionRow[]>();
  for (const session of sessions) {
    const rows = byGroup.get(session.groupId) ?? [];
    rows.push(session);
    byGroup.set(session.groupId, rows);
  }

  return groups.map((group) => {
    const rows = byGroup.get(group.id) ?? [];
    const passed = rows.filter((row) => row.passed).length;
    return {
      groupId: group.id,
      groupName: group.name,
      sessions: rows.length,
      passRate: computePassRate(passed, rows.length),
    };
  });
}

function toDateKey(date: Date): string {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
