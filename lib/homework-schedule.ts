/** Homework schedule helpers. V1 uses Bangladesh Standard Time (UTC+06:00). */

export const DHAKA_OFFSET_MINUTES = 6 * 60;
export const HOMEWORK_HORIZON_DAYS = 56;

export interface HomeworkSlotInput {
  dayOfWeek: number;
  openMinute: number;
  dueMinute: number;
}

export interface OccurrenceWindow {
  opensAt: Date;
  dueAt: Date;
}

export function parseDateOnly(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) return null;
  return date;
}

export function parseTimeToMinute(value: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return hour * 60 + minute;
}

export function parseDhakaLocalDateTime(value: string): Date | null {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})$/.exec(value);
  if (!match) return null;
  const date = parseDateOnly(match[1]);
  const minute = parseTimeToMinute(match[2]);
  return date && minute !== null ? dhakaDateTime(date, minute) : null;
}

export function dhakaDateTime(dateOnly: Date, minuteOfDay: number): Date {
  return new Date(
    Date.UTC(
      dateOnly.getUTCFullYear(),
      dateOnly.getUTCMonth(),
      dateOnly.getUTCDate(),
      0,
      minuteOfDay - DHAKA_OFFSET_MINUTES,
    ),
  );
}

export function dateOnlyInDhaka(now = new Date()): Date {
  const local = new Date(now.getTime() + DHAKA_OFFSET_MINUTES * 60_000);
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()));
}

export function formatDhakaDateTime(date: Date): string {
  return new Intl.DateTimeFormat("en-BD", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Dhaka",
  }).format(date);
}

export function buildWeeklyOccurrenceWindows(input: {
  startDate: Date;
  endDate?: Date | null;
  slots: HomeworkSlotInput[];
  fromDate: Date;
  throughDate: Date;
}): OccurrenceWindow[] {
  const startMs = Math.max(input.startDate.getTime(), input.fromDate.getTime());
  const endMs = Math.min(
    input.endDate?.getTime() ?? Number.POSITIVE_INFINITY,
    input.throughDate.getTime(),
  );
  if (endMs < startMs) return [];

  const slots = new Map(input.slots.map((slot) => [slot.dayOfWeek, slot]));
  const cursor = new Date(startMs);
  cursor.setUTCHours(0, 0, 0, 0);
  const result: OccurrenceWindow[] = [];
  while (cursor.getTime() <= endMs) {
    const slot = slots.get(cursor.getUTCDay());
    if (slot) {
      result.push({
        opensAt: dhakaDateTime(cursor, slot.openMinute),
        dueAt: dhakaDateTime(cursor, slot.dueMinute),
      });
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return result;
}

export function homeworkTiming(startedAt: Date, submittedAt: Date, dueAt: Date, limitMinutes: number) {
  const completionSeconds = Math.max(0, Math.floor((submittedAt.getTime() - startedAt.getTime()) / 1000));
  const lateBySeconds = Math.max(0, Math.floor((submittedAt.getTime() - dueAt.getTime()) / 1000));
  const overtimeSeconds = Math.max(0, completionSeconds - limitMinutes * 60);
  return {
    completionSeconds,
    isLate: lateBySeconds > 0,
    lateBySeconds,
    isOverTimeLimit: overtimeSeconds > 0,
    overtimeSeconds,
  };
}
