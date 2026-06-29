// Scheduled exam window helpers — pure date logic shared by server + UI.

export type ExamWindowStatus = "upcoming" | "open" | "closed";

/** Whether `now` falls inside the inclusive exam window. */
export function isExamWindowOpen(
  nowMs: number,
  opensAt: Date,
  closesAt: Date,
): boolean {
  return nowMs >= opensAt.getTime() && nowMs <= closesAt.getTime();
}

/** High-level status for a scheduled exam window. */
export function getExamWindowStatus(
  nowMs: number,
  opensAt: Date,
  closesAt: Date,
): ExamWindowStatus {
  if (nowMs < opensAt.getTime()) return "upcoming";
  if (nowMs > closesAt.getTime()) return "closed";
  return "open";
}

/** Validate schedule bounds when creating or updating an exam. */
export function validateScheduledExamWindow(
  opensAt: Date,
  closesAt: Date,
): string | null {
  if (!(opensAt instanceof Date) || Number.isNaN(opensAt.getTime())) {
    return "Invalid start time.";
  }
  if (!(closesAt instanceof Date) || Number.isNaN(closesAt.getTime())) {
    return "Invalid end time.";
  }
  if (closesAt.getTime() <= opensAt.getTime()) {
    return "End time must be after the start time.";
  }
  return null;
}
