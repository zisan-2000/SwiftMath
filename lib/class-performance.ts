// Pure helpers for teacher-entered class performance records.

export type ClassPerformancePeriod = "all" | "30" | "60" | "180";

export interface ClassPerformanceRankingStudent {
  id: string;
  name: string;
}

export interface ClassPerformanceRankingSheet {
  maximumMark: number;
  entries: Array<{
    studentId: string;
    mark: number;
    status: "PRESENT" | "ABSENT";
  }>;
}

export interface ClassPerformanceRankingRow {
  rank: number;
  studentId: string;
  name: string;
  classCount: number;
  presentCount: number;
  absentCount: number;
  totalMark: number;
  totalMaximumMark: number;
  percentage: number;
}

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Parse a YYYY-MM-DD calendar date without applying the server timezone. */
export function parseClassDate(value: string): Date | null {
  if (!DATE_KEY_PATTERN.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10) === value ? date : null;
}

/** Stable YYYY-MM-DD key for a PostgreSQL DATE value. */
export function classDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Today's calendar date in Bangladesh, suitable for a date input. */
export function todayInDhaka(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function formatClassDate(date: Date | string): string {
  const value = typeof date === "string" ? parseClassDate(date) : date;
  if (!value) return "Invalid date";
  return value.toLocaleDateString("en-GB", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function parseClassPerformancePeriod(
  value: string | undefined,
): ClassPerformancePeriod {
  if (value === "30" || value === "60" || value === "180") return value;
  return "all";
}

/** Inclusive start date for a period, or null for all-time. */
export function classPerformancePeriodStart(
  period: ClassPerformancePeriod,
  now: Date = new Date(),
): Date | null {
  if (period === "all") return null;
  const today = parseClassDate(todayInDhaka(now));
  if (!today) return null;
  today.setUTCDate(today.getUTCDate() - (Number(period) - 1));
  return today;
}

export function percentage(mark: number, maximumMark: number): number {
  if (maximumMark <= 0) return 0;
  return Math.round((mark / maximumMark) * 10_000) / 100;
}

/** Weighted class-performance ranking. Absent entries remain in the denominator. */
export function buildClassPerformanceRanking(
  students: ClassPerformanceRankingStudent[],
  sheets: ClassPerformanceRankingSheet[],
): ClassPerformanceRankingRow[] {
  const aggregates = new Map<
    string,
    Omit<ClassPerformanceRankingRow, "rank" | "studentId" | "name" | "percentage">
  >();

  for (const student of students) {
    aggregates.set(student.id, {
      classCount: 0,
      presentCount: 0,
      absentCount: 0,
      totalMark: 0,
      totalMaximumMark: 0,
    });
  }

  for (const sheet of sheets) {
    for (const entry of sheet.entries) {
      const aggregate = aggregates.get(entry.studentId);
      if (!aggregate) continue;
      aggregate.classCount += 1;
      aggregate.totalMark += entry.mark;
      aggregate.totalMaximumMark += sheet.maximumMark;
      if (entry.status === "ABSENT") aggregate.absentCount += 1;
      else aggregate.presentCount += 1;
    }
  }

  const rows = students.map((student) => {
    const aggregate = aggregates.get(student.id)!;
    return {
      studentId: student.id,
      name: student.name,
      ...aggregate,
      totalMark: Math.round(aggregate.totalMark * 100) / 100,
      totalMaximumMark: Math.round(aggregate.totalMaximumMark * 100) / 100,
      percentage: percentage(aggregate.totalMark, aggregate.totalMaximumMark),
    };
  });

  rows.sort((a, b) => {
    if (b.percentage !== a.percentage) return b.percentage - a.percentage;
    if (b.totalMark !== a.totalMark) return b.totalMark - a.totalMark;
    return a.name.localeCompare(b.name);
  });

  return rows.map((row, index) => ({ rank: index + 1, ...row }));
}

