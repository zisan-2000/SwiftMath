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
    case Role.TEACHER:
      return "/teacher/notifications";
    case Role.ADMIN:
      return "/admin/notifications";
    default:
      return null;
  }
}

/** Whether the signed-in role receives in-app notifications. */
export function roleHasNotificationInbox(role: Role): boolean {
  return notificationsPageHref(role) !== null;
}

/** Stable dedupe keys for idempotent notification delivery. */
export const notificationDedupeKeys = {
  examOpen: (examId: string) => `EXAM_OPEN:${examId}`,
  levelAssigned: (studentId: string, levelId: string) =>
    `LEVEL_ASSIGNED:${studentId}:${levelId}`,
  studentJoinedGroup: (groupId: string, studentId: string) =>
    `STUDENT_JOINED:${groupId}:${studentId}`,
  bankPartial: (levelId: string) => `BANK_PARTIAL:${levelId}`,
} as const;

/** Human-readable type label for badges. */
export function formatNotificationTypeLabel(type: NotificationType): string {
  switch (type) {
    case NotificationType.EXAM_SCHEDULED:
      return "Exam scheduled";
    case NotificationType.EXAM_OPEN:
      return "Exam open";
    case NotificationType.LEVEL_UP:
      return "Level up";
    case NotificationType.LEVEL_ASSIGNED:
      return "Level set";
    case NotificationType.STUDENT_JOINED_GROUP:
      return "New student";
    case NotificationType.BANK_ONLY_BLOCKED:
      return "Bank-only";
    case NotificationType.BANK_PARTIAL_WARNING:
      return "Bank partial";
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

/** Student notification when an exam window opens. */
export function buildExamOpenNotification(input: {
  examTitle: string | null;
  levelName: string;
  closesAt: Date;
}): { title: string; body: string; href: string } {
  const label = input.examTitle?.trim() || input.levelName;
  const closes = formatNotificationTimestamp(input.closesAt);
  return {
    title: "Exam is open",
    body: `${label} is open now — closes ${closes}.`,
    href: "/student",
  };
}

/** Student notification when a teacher assigns a starting level. */
export function buildLevelAssignedNotification(input: {
  levelName: string;
}): { title: string; body: string; href: string } {
  return {
    title: "Level updated",
    body: `Your teacher set your level to ${input.levelName}.`,
    href: "/student/practice",
  };
}

/** Teacher notification when a student joins their group. */
export function buildStudentJoinedGroupNotification(input: {
  studentName: string;
  groupName: string;
  groupId: string;
}): { title: string; body: string; href: string } {
  return {
    title: "New student",
    body: `${input.studentName} joined ${input.groupName}.`,
    href: `/teacher/groups/${input.groupId}`,
  };
}

/** Admin notification when bank coverage is partial (hybrid sessions). */
export function buildBankPartialWarningNotification(input: {
  levelId: string;
  levelName: string;
  detail: string;
}): { title: string; body: string; href: string } {
  return {
    title: "Question bank partial",
    body: `${input.levelName}: ${input.detail}`,
    href: `/admin/levels/${input.levelId}/questions`,
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
