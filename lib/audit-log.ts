// Audit trail helpers — labels and summary formatting (framework-agnostic).

import { AuditAction } from "@/lib/generated/prisma/enums";

/** Truncate long question prompts for log lines. */
export function truncateAuditPrompt(prompt: string, maxLength = 48): string {
  const trimmed = prompt.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength - 1)}…`;
}

/** Human-readable action label for admin UI badges. */
export function formatAuditActionLabel(action: AuditAction): string {
  switch (action) {
    case AuditAction.QUESTION_CREATED:
      return "Question added";
    case AuditAction.QUESTION_UPDATED:
      return "Question edited";
    case AuditAction.QUESTION_DELETED:
      return "Question deleted";
    case AuditAction.QUESTION_PUBLISHED:
      return "Published";
    case AuditAction.QUESTION_UNPUBLISHED:
      return "Moved to draft";
    case AuditAction.QUESTION_ENABLED:
      return "Enabled (institute)";
    case AuditAction.QUESTION_DISABLED:
      return "Disabled (institute)";
    case AuditAction.QUESTIONS_IMPORTED:
      return "CSV import";
    case AuditAction.QUESTIONS_REORDERED:
      return "Reordered";
    case AuditAction.GROUP_QUESTION_ENABLED:
      return "Enabled (group)";
    case AuditAction.GROUP_QUESTION_DISABLED:
      return "Disabled (group)";
    case AuditAction.CURRICULUM_VERSION_BUMPED:
      return "Curriculum bump";
    case AuditAction.LEVEL_BANK_ONLY_ENABLED:
      return "Bank-only on";
    case AuditAction.LEVEL_BANK_ONLY_DISABLED:
      return "Bank-only off";
    case AuditAction.PERMISSION_GRANTED:
      return "Permission granted";
    case AuditAction.PERMISSION_REVOKED:
      return "Permission revoked";
    default:
      return action;
  }
}

/** Actions shown in the admin activity filter dropdown. */
export const AUDIT_ACTION_FILTER_OPTIONS: AuditAction[] = [
  AuditAction.GROUP_QUESTION_DISABLED,
  AuditAction.GROUP_QUESTION_ENABLED,
  AuditAction.QUESTION_PUBLISHED,
  AuditAction.QUESTION_UNPUBLISHED,
  AuditAction.QUESTION_ENABLED,
  AuditAction.QUESTION_DISABLED,
  AuditAction.QUESTIONS_IMPORTED,
  AuditAction.QUESTIONS_REORDERED,
  AuditAction.CURRICULUM_VERSION_BUMPED,
  AuditAction.PERMISSION_GRANTED,
  AuditAction.PERMISSION_REVOKED,
  AuditAction.LEVEL_BANK_ONLY_ENABLED,
  AuditAction.LEVEL_BANK_ONLY_DISABLED,
  AuditAction.QUESTION_CREATED,
  AuditAction.QUESTION_UPDATED,
  AuditAction.QUESTION_DELETED,
];

/** Parse `?action=` for the activity log filter. */
export function parseAuditActionFilter(
  value: string | undefined,
): AuditAction | null {
  if (!value) return null;
  return AUDIT_ACTION_FILTER_OPTIONS.includes(value as AuditAction)
    ? (value as AuditAction)
    : null;
}

/** Teacher-scoped audit actions (group question overrides only). */
export const TEACHER_AUDIT_ACTIONS: AuditAction[] = [
  AuditAction.GROUP_QUESTION_ENABLED,
  AuditAction.GROUP_QUESTION_DISABLED,
];

/** Build a teacher activity log URL, optionally filtered to one group. */
export function teacherActivityHref(
  options: { groupId?: string | null; page?: number } = {},
): string {
  const params = new URLSearchParams();
  if (options.groupId) params.set("group", options.groupId);
  if (options.page && options.page > 1) params.set("page", String(options.page));
  const qs = params.toString();
  return qs ? `/teacher/activity?${qs}` : "/teacher/activity";
}

/** Parse `?group=` for teacher activity scope. */
export function parseTeacherActivityGroupFilter(
  value: string | undefined,
): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/** Build query string for paginated activity links. */
export function auditActivityHref(
  basePath: string,
  page: number,
  action: AuditAction | null,
): string {
  const params = new URLSearchParams();
  if (page > 1) params.set("page", String(page));
  if (action) params.set("action", action);
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

/** Format timestamp for activity list rows. */
export function formatAuditTimestamp(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
