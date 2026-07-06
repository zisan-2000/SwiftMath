import { getExamWindowStatus, type ExamWindowStatus } from "@/lib/exam-window";

/** Normalized scheduled-exam row for teacher list/table UIs. */
export interface ScheduledExamListItem {
  id: string;
  title: string | null;
  opensAt: Date;
  closesAt: Date;
  level: { name: string };
  attemptCount: number;
  paperQuestionCount: number;
  group?: { id: string; name: string };
}

export function formatExamWindow(opensAt: Date, closesAt: Date): string {
  const opts: Intl.DateTimeFormatOptions = {
    dateStyle: "medium",
    timeStyle: "short",
  };
  return `${opensAt.toLocaleString(undefined, opts)} → ${closesAt.toLocaleString(undefined, opts)}`;
}

export function examStatusLabel(status: ExamWindowStatus): string {
  if (status === "open") return "Open";
  if (status === "upcoming") return "Upcoming";
  return "Closed";
}

export function examStatusBadgeVariant(
  status: ExamWindowStatus,
): "success" | "secondary" | "muted" {
  if (status === "open") return "success";
  if (status === "upcoming") return "secondary";
  return "muted";
}

export function resolveExamWindowStatus(
  opensAt: Date,
  closesAt: Date,
  nowMs = Date.now(),
): ExamWindowStatus {
  return getExamWindowStatus(nowMs, opensAt, closesAt);
}

export function examDisplayTitle(exam: ScheduledExamListItem): string {
  return exam.title?.trim() || exam.level.name;
}
