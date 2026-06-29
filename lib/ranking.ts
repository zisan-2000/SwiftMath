// Pure leaderboard helpers — sorting and period windows.
// Kept framework-agnostic so ranking rules are unit-testable.

/** Time window for ranking stats (passed count + average accuracy). */
export type LeaderboardPeriod = "all" | "week" | "month";

/** One row before rank numbers are assigned. */
export interface LeaderboardRow {
  studentId: string;
  name: string;
  levelName: string | null;
  levelOrder: number | null;
  passedCount: number;
  avgAccuracy: number;
  /** Fastest finish (ms) among passed sessions with 100% accuracy in scope. */
  fastestPassMs: number | null;
}

/** Row with a 1-based rank after sorting. */
export type RankedLeaderboardRow = LeaderboardRow & { rank: number };

/** Institute leaderboard row extended with tenant name (global ranking). */
export type GlobalLeaderboardRow = LeaderboardRow & {
  instituteName: string;
};

export type RankedGlobalLeaderboardRow = GlobalLeaderboardRow & { rank: number };

const PERIOD_DAYS: Record<Exclude<LeaderboardPeriod, "all">, number> = {
  week: 7,
  month: 30,
};

/** Parse a period query value, falling back to `all`. */
export function parseLeaderboardPeriod(value: string | undefined): LeaderboardPeriod {
  if (value === "week" || value === "month") return value;
  return "all";
}

/**
 * Start of the ranking window for `period`, or null for all-time stats.
 * Uses calendar-day subtraction from `now` (same approach as analytics charts).
 */
export function leaderboardPeriodStart(
  period: LeaderboardPeriod,
  now: Date = new Date(),
): Date | null {
  if (period === "all") return null;
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (PERIOD_DAYS[period] - 1));
  return start;
}

/** Keep only students with a qualifying 100% accuracy pass in the current scope. */
export function filterQualifiedLeaderboardRows<T extends LeaderboardRow>(
  rows: T[],
): T[] {
  return rows.filter((row) => row.fastestPassMs !== null);
}

/**
 * Strict ranking rule: every finished attempt in scope must be 100% accurate.
 * Students with any sub-100% session lose their fastest-pass time (and rank).
 */
export function applyStrictHundredPercentRule<T extends LeaderboardRow>(
  rows: T[],
  studentIdsWithSubPerfectSessions: Iterable<string>,
): T[] {
  const imperfect = new Set(studentIdsWithSubPerfectSessions);
  return rows.map((row) =>
    imperfect.has(row.studentId) ? { ...row, fastestPassMs: null } : row,
  );
}

/**
 * Order students for the leaderboard (after strict 100% filtering):
 *   1. has a qualifying 100% pass in scope (fastestPassMs set),
 *   2. fastest 100% pass time (asc — lower is better),
 *   3. passed attempts in scope (desc),
 *   4. average accuracy in scope (desc),
 *   5. name (asc).
 */
export function rankLeaderboardRows(rows: LeaderboardRow[]): RankedLeaderboardRow[] {
  const sorted = [...rows].sort((a, b) => {
    const aHasPerfect = a.fastestPassMs !== null;
    const bHasPerfect = b.fastestPassMs !== null;
    if (aHasPerfect !== bHasPerfect) return aHasPerfect ? -1 : 1;
    if (aHasPerfect && bHasPerfect && a.fastestPassMs !== b.fastestPassMs) {
      return a.fastestPassMs! - b.fastestPassMs!;
    }
    if (b.passedCount !== a.passedCount) return b.passedCount - a.passedCount;
    if (b.avgAccuracy !== a.avgAccuracy) return b.avgAccuracy - a.avgAccuracy;
    return a.name.localeCompare(b.name);
  });

  return sorted.map((row, index) => ({ rank: index + 1, ...row }));
}

/** Human-readable finish time for the leaderboard (e.g. "1m 23s"). */
export function formatPassDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}
