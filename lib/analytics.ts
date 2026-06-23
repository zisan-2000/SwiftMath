// Pure analytics helpers — bucket session rows into daily counts for charts.
// Kept framework-agnostic so the bucketing logic is unit-testable.

/** One day on the practice-activity chart. */
export interface DailySessionCount {
  /** ISO date key (YYYY-MM-DD) for stable chart identity. */
  date: string;
  /** Short label for the x-axis, e.g. "Mon". */
  label: string;
  /** Finished practice attempts started on this day. */
  sessions: number;
  /** Attempts that met the level pass threshold. */
  passed: number;
}

/**
 * Bucket finished session rows into the last `days` calendar days (inclusive of
 * today). Missing days are filled with zero so the chart always shows a full
 * window.
 */
export function buildDailySessionCounts(
  rows: { createdAt: Date; passed: boolean }[],
  days: number,
  now: Date = new Date(),
): DailySessionCount[] {
  const dayCount = Math.max(1, days);
  const buckets = new Map<string, DailySessionCount>();

  // Seed every day in the window with zero counts.
  for (let i = dayCount - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const date = toDateKey(d);
    buckets.set(date, {
      date,
      label: d.toLocaleDateString("en-US", { weekday: "short" }),
      sessions: 0,
      passed: 0,
    });
  }

  for (const row of rows) {
    const key = toDateKey(row.createdAt);
    const bucket = buckets.get(key);
    if (!bucket) continue;
    bucket.sessions += 1;
    if (row.passed) bucket.passed += 1;
  }

  return [...buckets.values()];
}

function toDateKey(date: Date): string {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Pass rate as an integer percentage (0–100), rounded. Returns 0 when there are
 * no attempts.
 */
export function computePassRate(passed: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((passed / total) * 100);
}

/**
 * Mean accuracy across attempts, rounded to an integer 0–100. Returns 0 when
 * empty.
 */
export function computeAverageAccuracy(accuracies: number[]): number {
  if (accuracies.length === 0) return 0;
  const sum = accuracies.reduce((a, v) => a + v, 0);
  return Math.round(sum / accuracies.length);
}
