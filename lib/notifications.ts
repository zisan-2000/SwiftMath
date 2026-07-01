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
  examClosingSoon: (examId: string) => `EXAM_CLOSING_SOON:${examId}`,
  examClosed: (examId: string) => `EXAM_CLOSED:${examId}`,
  levelAssigned: (studentId: string, levelId: string) =>
    `LEVEL_ASSIGNED:${studentId}:${levelId}`,
  studentJoinedGroup: (groupId: string, studentId: string) =>
    `STUDENT_JOINED:${groupId}:${studentId}`,
  groupBankBlocked: (groupId: string, levelId: string) =>
    `GROUP_BANK_BLOCKED:${groupId}:${levelId}`,
  groupQuestionDisabled: (groupId: string, questionId: string) =>
    `GROUP_QUESTION_DISABLED:${groupId}:${questionId}`,
  bankPartial: (levelId: string) => `BANK_PARTIAL:${levelId}`,
  curriculumBumped: (versionId: string) => `CURRICULUM_BUMPED:${versionId}`,
} as const;

/** Human-readable type label for badges. */
export function formatNotificationTypeLabel(type: NotificationType): string {
  switch (type) {
    case NotificationType.EXAM_SCHEDULED:
      return "Exam scheduled";
    case NotificationType.EXAM_OPEN:
      return "Exam open";
    case NotificationType.EXAM_CLOSING_SOON:
      return "Exam closing";
    case NotificationType.EXAM_CLOSED_SUMMARY:
      return "Exam summary";
    case NotificationType.LEVEL_UP:
      return "Level up";
    case NotificationType.LEVEL_ASSIGNED:
      return "Level set";
    case NotificationType.STUDENT_JOINED_GROUP:
      return "New student";
    case NotificationType.GROUP_BANK_BLOCKED:
      return "Bank blocked";
    case NotificationType.GROUP_QUESTION_DISABLED:
      return "Question off";
    case NotificationType.BANK_ONLY_BLOCKED:
      return "Bank-only";
    case NotificationType.BANK_PARTIAL_WARNING:
      return "Bank partial";
    case NotificationType.CURRICULUM_BUMPED:
      return "Curriculum";
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

/** Student notification when an exam closes within one hour. */
export function buildExamClosingSoonNotification(input: {
  examTitle: string | null;
  levelName: string;
  closesAt: Date;
}): { title: string; body: string; href: string } {
  const label = input.examTitle?.trim() || input.levelName;
  const closes = formatNotificationTimestamp(input.closesAt);
  return {
    title: "Exam closing soon",
    body: `${label} closes at ${closes}. Start your attempt if you have not yet.`,
    href: "/student",
  };
}

/** Teacher notification after an exam window ends. */
export function buildExamClosedSummaryNotification(input: {
  examTitle: string | null;
  levelName: string;
  groupName: string;
  groupId: string;
  attemptedCount: number;
  studentCount: number;
}): { title: string; body: string; href: string } {
  const label = input.examTitle?.trim() || input.levelName;
  return {
    title: "Exam closed",
    body: `${label} for ${input.groupName} closed — ${input.attemptedCount}/${input.studentCount} students attempted.`,
    href: `/teacher/groups/${input.groupId}/analytics`,
  };
}

/** Teacher notification when bank-only practice is blocked for a group. */
export function buildGroupBankBlockedNotification(input: {
  groupName: string;
  groupId: string;
  levelName: string;
  available: number;
  required: number;
}): { title: string; body: string; href: string } {
  return {
    title: "Practice blocked",
    body: `${input.groupName} — ${input.levelName} has only ${input.available}/${input.required} bank questions available. Check group question overrides.`,
    href: `/teacher/groups/${input.groupId}/questions`,
  };
}

/** Admin notification when a teacher disables a bank question for their group. */
export function buildGroupQuestionDisabledAdminNotification(input: {
  teacherName: string;
  groupName: string;
  levelName: string;
  prompt: string;
}): { title: string; body: string; href: string } {
  return {
    title: "Teacher disabled a question",
    body: `${input.teacherName} disabled "${input.prompt}" in ${input.groupName} (${input.levelName}).`,
    href: "/admin/activity?action=GROUP_QUESTION_DISABLED",
  };
}

/** Admin notification after a curriculum version bump. */
export function buildCurriculumBumpedNotification(input: {
  versionNumber: number;
  label: string | null;
}): { title: string; body: string; href: string } {
  const suffix = input.label ? ` — ${input.label}` : "";
  return {
    title: "Curriculum updated",
    body: `Curriculum v${input.versionNumber}${suffix} is now active. Publish questions into the new generation when ready.`,
    href: "/admin/settings",
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
