// In-app notification helpers — labels, hrefs, and message formatting.

import { NotificationType, Role } from "@/lib/generated/prisma/enums";

/** One row in the notification bell dropdown or inbox page. */
export interface NotificationListItem {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  href: string;
  readAt: Date | null;
  createdAt: Date;
}

/** Format a notification timestamp for list UI. */
export function formatNotificationTimestamp(date: Date): string {
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/** Full notifications page for a role, or null when that role has no inbox. */
export function notificationsPageHref(role: Role): string | null {
  switch (role) {
    case Role.STUDENT:
      return "/student/notifications";
    case Role.ADMIN:
      return "/admin/notifications";
    default:
      return null;
  }
}

/** Whether the signed-in role receives in-app notifications in N1. */
export function roleHasNotificationInbox(role: Role): boolean {
  return notificationsPageHref(role) !== null;
}

/** Human-readable type label for badges. */
export function formatNotificationTypeLabel(type: NotificationType): string {
  switch (type) {
    case NotificationType.EXAM_SCHEDULED:
      return "Exam";
    case NotificationType.LEVEL_UP:
      return "Level up";
    case NotificationType.BANK_ONLY_BLOCKED:
      return "Bank-only";
    default:
      return type;
  }
}

function formatExamWindow(opensAt: Date, closesAt: Date): string {
  const opens = formatNotificationTimestamp(opensAt);
  const closes = formatNotificationTimestamp(closesAt);
  return `Opens ${opens} — closes ${closes}.`;
}

/** Student notification when a teacher schedules a group exam. */
export function buildExamScheduledNotification(input: {
  examTitle: string | null;
  levelName: string;
  groupName: string;
  opensAt: Date;
  closesAt: Date;
}): { title: string; body: string; href: string } {
  const label = input.examTitle?.trim() || input.levelName;
  return {
    title: "Exam scheduled",
    body: `${label} for ${input.groupName}. ${formatExamWindow(input.opensAt, input.closesAt)}`,
    href: "/student",
  };
}

/** Student notification after a successful level-up. */
export function buildLevelUpNotification(input: {
  levelName: string;
}): { title: string; body: string; href: string } {
  return {
    title: "Level up!",
    body: `You reached ${input.levelName}. Keep practising at your new level.`,
    href: "/student/practice",
  };
}

/** Admin notification when bank-only mode blocks practice on a level. */
export function buildBankOnlyBlockedNotification(input: {
  levelId: string;
  levelName: string;
  detail: string;
}): { title: string; body: string; href: string } {
  return {
    title: "Bank-only practice blocked",
    body: `${input.levelName}: ${input.detail}`,
    href: `/admin/levels/${input.levelId}`,
  };
}

/** Paginated notifications list query string. */
export function notificationsListHref(
  role: Role,
  page: number,
): string | null {
  const base = notificationsPageHref(role);
  if (!base) return null;
  if (page <= 1) return base;
  return `${base}?page=${page}`;
}
