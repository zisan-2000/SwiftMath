// Pure gamification helpers — streaks and badges from practice history.
// Framework-agnostic so rules are unit-testable.

export type StudentBadgeId =
  | "first-pass"
  | "level-up"
  | "perfect-score"
  | "hot-streak"
  | "weekly-warrior";

export interface StudentBadgeDefinition {
  id: StudentBadgeId;
  label: string;
  description: string;
}

export interface StudentBadge extends StudentBadgeDefinition {
  earned: boolean;
}

/** Inputs derived from server-written session rows. */
export interface StudentGamificationStats {
  streakDays: number;
  passedCount: number;
  leveledUpCount: number;
  hasPerfectScore: boolean;
  sessionsLast7Days: number;
}

export const STUDENT_BADGE_DEFINITIONS: StudentBadgeDefinition[] = [
  {
    id: "first-pass",
    label: "First pass",
    description: "Passed a timed practice for the first time",
  },
  {
    id: "level-up",
    label: "Level up",
    description: "Leveled up to the next stage",
  },
  {
    id: "perfect-score",
    label: "Perfect score",
    description: "Scored 100% on a timed attempt",
  },
  {
    id: "hot-streak",
    label: "Hot streak",
    description: "Practised 3 days in a row",
  },
  {
    id: "weekly-warrior",
    label: "Weekly warrior",
    description: "Practised 5+ days in the last 7",
  },
];

function toDateKey(date: Date): string {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Count consecutive calendar days with at least one finished practice, ending
 * today or yesterday (so a streak is not lost until a full day is missed).
 */
export function computePracticeStreak(
  practiceDayKeys: Iterable<string>,
  now: Date = new Date(),
): number {
  const days = new Set(practiceDayKeys);
  if (days.size === 0) return 0;

  const cursor = new Date(now);
  cursor.setHours(0, 0, 0, 0);

  const todayKey = toDateKey(cursor);
  if (!days.has(todayKey)) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let streak = 0;
  while (days.has(toDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

/** Count distinct practice days in the last `windowDays` calendar days. */
export function countPracticeDaysInWindow(
  sessionDates: Date[],
  windowDays: number,
  now: Date = new Date(),
): number {
  const windowStart = new Date(now);
  windowStart.setHours(0, 0, 0, 0);
  windowStart.setDate(windowStart.getDate() - (Math.max(1, windowDays) - 1));

  const keys = new Set<string>();
  for (const date of sessionDates) {
    if (date >= windowStart) {
      keys.add(toDateKey(date));
    }
  }
  return keys.size;
}

function isBadgeEarned(
  id: StudentBadgeId,
  stats: StudentGamificationStats,
): boolean {
  switch (id) {
    case "first-pass":
      return stats.passedCount >= 1;
    case "level-up":
      return stats.leveledUpCount >= 1;
    case "perfect-score":
      return stats.hasPerfectScore;
    case "hot-streak":
      return stats.streakDays >= 3;
    case "weekly-warrior":
      return stats.sessionsLast7Days >= 5;
    default:
      return false;
  }
}

/** Build the full badge list with earned flags. */
export function buildStudentBadges(
  stats: StudentGamificationStats,
): StudentBadge[] {
  return STUDENT_BADGE_DEFINITIONS.map((badge) => ({
    ...badge,
    earned: isBadgeEarned(badge.id, stats),
  }));
}

/** Session dates → calendar-day keys for streak calculation. */
export function practiceDayKeysFromDates(dates: Date[]): Set<string> {
  return new Set(dates.map(toDateKey));
}
