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
}

/** Row with a 1-based rank after sorting. */
export type RankedLeaderboardRow = LeaderboardRow & { rank: number };

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

/**
 * Order students for the institute leaderboard:
 *   1. current level order (desc),
 *   2. passed attempts in scope (desc),
 *   3. average accuracy in scope (desc),
 *   4. name (asc).
 * Students with no assigned level sort last.
 */
export function rankLeaderboardRows(rows: LeaderboardRow[]): RankedLeaderboardRow[] {
  const sorted = [...rows].sort((a, b) => {
    const ao = a.levelOrder ?? -1;
    const bo = b.levelOrder ?? -1;
    if (bo !== ao) return bo - ao;
    if (b.passedCount !== a.passedCount) return b.passedCount - a.passedCount;
    if (b.avgAccuracy !== a.avgAccuracy) return b.avgAccuracy - a.avgAccuracy;
    return a.name.localeCompare(b.name);
  });

  return sorted.map((row, index) => ({ rank: index + 1, ...row }));
}
