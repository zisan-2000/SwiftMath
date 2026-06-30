// Parse teacher schedule-exam form fields — kept pure for tests + server actions.

import { validateScheduledExamWindow } from "@/lib/exam-window";

export interface ParsedScheduleExamForm {
  title: string | null;
  levelId: string;
  opensAt: Date;
  closesAt: Date;
}

/** Format a Date for `<input type="datetime-local">` in local time. */
export function toDatetimeLocalValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Parse `datetime-local` input as local wall-clock time. */
export function parseDatetimeLocalField(raw: string): Date | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const match =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(trimmed);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = match[6] ? Number(match[6]) : 0;

  const date = new Date(year, month - 1, day, hour, minute, second, 0);
  if (Number.isNaN(date.getTime())) return null;
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

export function parseScheduleExamForm(input: {
  title?: string;
  levelId: string;
  opensAtRaw: string;
  closesAtRaw: string;
}): { ok: true; data: ParsedScheduleExamForm } | { ok: false; error: string } {
  const levelId = input.levelId.trim();
  if (!levelId) {
    return { ok: false, error: "Choose a level for this exam." };
  }

  const opensAt = parseDatetimeLocalField(input.opensAtRaw);
  if (!opensAt) {
    return { ok: false, error: "Enter a valid exam start time." };
  }

  const closesAt = parseDatetimeLocalField(input.closesAtRaw);
  if (!closesAt) {
    return { ok: false, error: "Enter a valid exam end time." };
  }

  const windowError = validateScheduledExamWindow(opensAt, closesAt);
  if (windowError) {
    return { ok: false, error: windowError };
  }

  const titleRaw = input.title?.trim() ?? "";
  const title = titleRaw.length > 0 ? titleRaw : null;

  return {
    ok: true,
    data: { title, levelId, opensAt, closesAt },
  };
}
