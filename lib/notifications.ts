// In-app notification helpers — labels, hrefs, and message formatting.

import { NotificationType, Role } from "@/lib/generated/prisma/enums";

/** Student home anchor for pending scheduled exam CTAs. */
export const STUDENT_PENDING_EXAM_HREF = "/student#pending-exam";

/** Structured notification context stored in the DB (N5). */
export interface NotificationMetadata {
  examId?: string;
  levelId?: string;
  groupId?: string;
  questionId?: string;
  targetUserId?: string;
  permission?: string;
  permissionEffect?: string;
  actorName?: string;
  /** Target tenant for platform (super-admin) alerts (N9). */
  targetInstituteId?: string;
  targetInstituteName?: string;
}

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

/** One toggle row on the account notification preferences panel (N7). */
export interface NotificationPreferenceView {
  type: NotificationType;
  enabled: boolean;
  label: string;
  description: string;
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
    case Role.SUPER_ADMIN:
      return "/super/notifications";
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
  examScheduled: (examId: string) => `EXAM_SCHEDULED:${examId}`,
  examCancelled: (examId: string) => `EXAM_CANCELLED:${examId}`,
  examOpen: (examId: string) => `EXAM_OPEN:${examId}`,
  examClosingSoon: (examId: string) => `EXAM_CLOSING_SOON:${examId}`,
  examClosed: (examId: string) => `EXAM_CLOSED:${examId}`,
  levelUp: (studentId: string, levelId: string) =>
    `LEVEL_UP:${studentId}:${levelId}`,
  levelAssigned: (studentId: string, levelId: string) =>
    `LEVEL_ASSIGNED:${studentId}:${levelId}`,
  studentJoinedGroup: (groupId: string, studentId: string) =>
    `STUDENT_JOINED:${groupId}:${studentId}`,
  groupBankBlocked: (groupId: string, levelId: string) =>
    `GROUP_BANK_BLOCKED:${groupId}:${levelId}`,
  groupQuestionDisabled: (groupId: string, questionId: string) =>
    `GROUP_QUESTION_DISABLED:${groupId}:${questionId}`,
  bankOnlyBlocked: (levelId: string) => `BANK_ONLY_BLOCKED:${levelId}`,
  bankPartial: (levelId: string) => `BANK_PARTIAL:${levelId}`,
  curriculumBumped: (versionId: string) => `CURRICULUM_BUMPED:${versionId}`,
  instituteCreated: (instituteId: string) => `INSTITUTE_CREATED:${instituteId}`,
  instituteDisabled: (instituteId: string) => `INSTITUTE_DISABLED:${instituteId}`,
  instituteEnabled: (instituteId: string) => `INSTITUTE_ENABLED:${instituteId}`,
  permissionChanged: (userId: string, permission: string) =>
    `PERMISSION_CHANGED:${userId}:${permission}`,
} as const;

/** Human-readable type label for badges. */
export function formatNotificationTypeLabel(type: NotificationType): string {
  switch (type) {
    case NotificationType.EXAM_SCHEDULED:
      return "Exam scheduled";
    case NotificationType.EXAM_CANCELLED:
      return "Exam cancelled";
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
    case NotificationType.INSTITUTE_CREATED:
      return "Institute created";
    case NotificationType.INSTITUTE_DISABLED:
      return "Institute disabled";
    case NotificationType.INSTITUTE_ENABLED:
      return "Institute enabled";
    case NotificationType.PERMISSION_CHANGED:
      return "Permission changed";
    default:
      return type;
  }
}

function formatExamWindow(opensAt: Date, closesAt: Date): string {
  const opens = formatNotificationTimestamp(opensAt);
  const closes = formatNotificationTimestamp(closesAt);
  return `Opens ${opens} — closes ${closes}.`;
}

/** Deep link to a tenant drill-in page for super admins. */
export function superInstituteHref(instituteId: string): string {
  return `/super/institutes/${instituteId}`;
}

/** Super-admin notification when a new institute is provisioned. */
export function buildInstituteCreatedNotification(input: {
  instituteName: string;
  instituteSlug: string;
  instituteId: string;
  actorName?: string | null;
}): { title: string; body: string; href: string } {
  const actorPrefix = input.actorName?.trim()
    ? `Provisioned by ${input.actorName.trim()}. `
    : "";
  return {
    title: "New institute",
    body: `${actorPrefix}${input.instituteName} (${input.instituteSlug}) is live with a starter curriculum.`,
    href: superInstituteHref(input.instituteId),
  };
}

/** Super-admin notification when a tenant is disabled. */
export function buildInstituteDisabledNotification(input: {
  instituteName: string;
  instituteId: string;
  actorName?: string | null;
}): { title: string; body: string; href: string } {
  const actorPrefix = input.actorName?.trim()
    ? `Disabled by ${input.actorName.trim()}. `
    : "";
  return {
    title: "Institute disabled",
    body: `${actorPrefix}${input.instituteName} — member sign-in is blocked until re-enabled.`,
    href: superInstituteHref(input.instituteId),
  };
}

/** Super-admin notification when a tenant is re-enabled. */
export function buildInstituteEnabledNotification(input: {
  instituteName: string;
  instituteId: string;
  actorName?: string | null;
}): { title: string; body: string; href: string } {
  const actorPrefix = input.actorName?.trim()
    ? `Enabled by ${input.actorName.trim()}. `
    : "";
  return {
    title: "Institute enabled",
    body: `${actorPrefix}${input.instituteName} is active again — members can sign in.`,
    href: superInstituteHref(input.instituteId),
  };
}

/** User notification when staff changes one account permission. */
export function buildPermissionChangedNotification(input: {
  permissionLabel: string;
  effect: string;
  actorName?: string | null;
  href: string;
}): { title: string; body: string; href: string } {
  const actorPrefix = input.actorName?.trim()
    ? `${input.actorName.trim()} updated your access. `
    : "Your access was updated. ";
  const effectLabel =
    input.effect === "ALLOW"
      ? "enabled"
      : input.effect === "DENY"
        ? "disabled"
        : "returned to role default";
  return {
    title: "Access updated",
    body: `${actorPrefix}${input.permissionLabel} is now ${effectLabel}.`,
    href: input.href,
  };
}

/** Student notification when a teacher schedules a group exam. */
export function buildExamScheduledNotification(input: {
  examTitle: string | null;
  levelName: string;
  groupName: string;
  opensAt: Date;
  closesAt: Date;
  actorName?: string | null;
}): { title: string; body: string; href: string } {
  const label = input.examTitle?.trim() || input.levelName;
  const actorPrefix = input.actorName?.trim()
    ? `Scheduled by ${input.actorName.trim()}. `
    : "";
  return {
    title: "Exam scheduled",
    body: `${actorPrefix}${label} for ${input.groupName}. ${formatExamWindow(input.opensAt, input.closesAt)}`,
    href: STUDENT_PENDING_EXAM_HREF,
  };
}

/** Student notification when a scheduled exam is cancelled before it runs. */
export function buildExamCancelledNotification(input: {
  examTitle: string | null;
  levelName: string;
  groupName: string;
  actorName?: string | null;
}): { title: string; body: string; href: string } {
  const label = input.examTitle?.trim() || input.levelName;
  const actorPrefix = input.actorName?.trim()
    ? `Cancelled by ${input.actorName.trim()}. `
    : "";
  return {
    title: "Exam cancelled",
    body: `${actorPrefix}${label} for ${input.groupName} will not run.`,
    href: STUDENT_PENDING_EXAM_HREF,
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
    href: STUDENT_PENDING_EXAM_HREF,
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
    href: STUDENT_PENDING_EXAM_HREF,
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
  return notificationInboxHref(role, { page });
}

export type NotificationReadFilter = "all" | "unread";

export interface NotificationInboxFilters {
  page: number;
  type: NotificationType | null;
  read: NotificationReadFilter;
}

/** Parse `?read=` for the inbox (defaults to all). */
export function parseNotificationReadFilter(
  value: string | undefined,
): NotificationReadFilter {
  return value === "unread" ? "unread" : "all";
}

/** Notification types a role can configure in account settings (N7). */
export function notificationPreferenceTypes(role: Role): NotificationType[] {
  return notificationTypeFilterOptions(role);
}

/** Whether this role may mute the given notification type. */
export function isConfigurableNotificationType(
  role: Role,
  type: NotificationType,
): boolean {
  return notificationPreferenceTypes(role).includes(type);
}

/** Short helper copy for the account preferences panel. */
export function notificationPreferenceDescription(
  type: NotificationType,
): string {
  switch (type) {
    case NotificationType.EXAM_SCHEDULED:
      return "When a teacher schedules a new exam for your group.";
    case NotificationType.EXAM_CANCELLED:
      return "When a scheduled exam is cancelled before it runs.";
    case NotificationType.EXAM_OPEN:
      return "When an exam window opens and you can start your attempt.";
    case NotificationType.EXAM_CLOSING_SOON:
      return "One-hour warning before an open exam closes.";
    case NotificationType.LEVEL_UP:
      return "When you pass a level and move up.";
    case NotificationType.LEVEL_ASSIGNED:
      return "When staff sets or changes your current level.";
    case NotificationType.EXAM_CLOSED_SUMMARY:
      return "After an exam closes, with how many students attempted.";
    case NotificationType.STUDENT_JOINED_GROUP:
      return "When a new student is added to one of your groups.";
    case NotificationType.GROUP_BANK_BLOCKED:
      return "When bank-only practice cannot start for your group.";
    case NotificationType.BANK_ONLY_BLOCKED:
      return "When bank-only mode blocks practice on a level.";
    case NotificationType.BANK_PARTIAL_WARNING:
      return "When hybrid sessions must fill gaps from a partial bank.";
    case NotificationType.GROUP_QUESTION_DISABLED:
      return "When a teacher disables a bank question for their group.";
    case NotificationType.CURRICULUM_BUMPED:
      return "When a new curriculum generation becomes active.";
    case NotificationType.INSTITUTE_CREATED:
      return "When a new institute is provisioned on the platform.";
    case NotificationType.INSTITUTE_DISABLED:
      return "When a tenant is disabled and members lose access.";
    case NotificationType.INSTITUTE_ENABLED:
      return "When a disabled tenant is re-enabled.";
    case NotificationType.PERMISSION_CHANGED:
      return "When staff changes one of your account permissions.";
    default:
      return "In-app alerts for this category.";
  }
}

/** Notification types shown in the inbox filter for each role. */
export function notificationTypeFilterOptions(role: Role): NotificationType[] {
  switch (role) {
    case Role.STUDENT:
      return [
        NotificationType.EXAM_SCHEDULED,
        NotificationType.EXAM_CANCELLED,
        NotificationType.EXAM_OPEN,
        NotificationType.EXAM_CLOSING_SOON,
        NotificationType.LEVEL_UP,
        NotificationType.LEVEL_ASSIGNED,
        NotificationType.PERMISSION_CHANGED,
      ];
    case Role.TEACHER:
      return [
        NotificationType.EXAM_CLOSED_SUMMARY,
        NotificationType.STUDENT_JOINED_GROUP,
        NotificationType.GROUP_BANK_BLOCKED,
        NotificationType.PERMISSION_CHANGED,
      ];
    case Role.ADMIN:
      return [
        NotificationType.BANK_ONLY_BLOCKED,
        NotificationType.BANK_PARTIAL_WARNING,
        NotificationType.GROUP_QUESTION_DISABLED,
        NotificationType.CURRICULUM_BUMPED,
        NotificationType.PERMISSION_CHANGED,
      ];
    case Role.SUPER_ADMIN:
      return [
        NotificationType.INSTITUTE_CREATED,
        NotificationType.INSTITUTE_DISABLED,
        NotificationType.INSTITUTE_ENABLED,
      ];
    default:
      return [];
  }
}

/** Parse `?type=` for the inbox filter dropdown. */
export function parseNotificationTypeFilter(
  role: Role,
  value: string | undefined,
): NotificationType | null {
  if (!value) return null;
  return notificationTypeFilterOptions(role).includes(value as NotificationType)
    ? (value as NotificationType)
    : null;
}

/** Build inbox URL with page, type, and read filters. */
export function notificationInboxHref(
  role: Role,
  options: {
    page?: number;
    type?: NotificationType | null;
    read?: NotificationReadFilter;
  } = {},
): string | null {
  const base = notificationsPageHref(role);
  if (!base) return null;

  const params = new URLSearchParams();
  const page = options.page ?? 1;
  if (page > 1) params.set("page", String(page));
  if (options.type) params.set("type", options.type);
  if (options.read === "unread") params.set("read", "unread");

  const query = params.toString();
  return query ? `${base}?${query}` : base;
}

/** Role-specific empty inbox copy. */
export function notificationEmptyStateCopy(
  role: Role,
  filters: Pick<NotificationInboxFilters, "type" | "read">,
): { title: string; description: string } {
  if (filters.type || filters.read === "unread") {
    return {
      title: "No matching notifications",
      description: "Try a different filter or show all notifications.",
    };
  }

  switch (role) {
    case Role.STUDENT:
      return {
        title: "No notifications yet",
        description:
          "Exam schedules, level-ups, and level changes will appear here when they happen.",
      };
    case Role.TEACHER:
      return {
        title: "No notifications yet",
        description:
          "New students, exam summaries, and practice block alerts will show up here.",
      };
    case Role.ADMIN:
      return {
        title: "No notifications yet",
        description:
          "Bank coverage issues, teacher overrides, and curriculum updates will appear here.",
      };
    case Role.SUPER_ADMIN:
      return {
        title: "No notifications yet",
        description:
          "Institute provisioning and tenant status changes will appear here.",
      };
    default:
      return {
        title: "No notifications",
        description: "You're all caught up.",
      };
  }
}

export type NotificationIconKey =
  | "exam"
  | "level"
  | "student"
  | "bank"
  | "curriculum"
  | "platform"
  | "alert";

export interface NotificationTypePresentation {
  icon: NotificationIconKey;
  accentClass: string;
}

/** Icon + accent styling for notification rows. */
export function getNotificationTypePresentation(
  type: NotificationType,
): NotificationTypePresentation {
  switch (type) {
    case NotificationType.EXAM_SCHEDULED:
    case NotificationType.EXAM_OPEN:
    case NotificationType.EXAM_CLOSING_SOON:
    case NotificationType.EXAM_CLOSED_SUMMARY:
      return {
        icon: "exam",
        accentClass: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
      };
    case NotificationType.EXAM_CANCELLED:
      return {
        icon: "exam",
        accentClass: "bg-muted text-muted-foreground",
      };
    case NotificationType.LEVEL_UP:
    case NotificationType.LEVEL_ASSIGNED:
    case NotificationType.PERMISSION_CHANGED:
      return {
        icon: "level",
        accentClass: "bg-primary/10 text-primary",
      };
    case NotificationType.STUDENT_JOINED_GROUP:
      return {
        icon: "student",
        accentClass: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
      };
    case NotificationType.BANK_ONLY_BLOCKED:
    case NotificationType.BANK_PARTIAL_WARNING:
    case NotificationType.GROUP_BANK_BLOCKED:
      return {
        icon: "bank",
        accentClass: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
      };
    case NotificationType.CURRICULUM_BUMPED:
      return {
        icon: "curriculum",
        accentClass: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
      };
    case NotificationType.INSTITUTE_CREATED:
      return {
        icon: "platform",
        accentClass: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
      };
    case NotificationType.INSTITUTE_DISABLED:
      return {
        icon: "platform",
        accentClass: "bg-destructive/10 text-destructive",
      };
    case NotificationType.INSTITUTE_ENABLED:
      return {
        icon: "platform",
        accentClass: "bg-primary/10 text-primary",
      };
    case NotificationType.GROUP_QUESTION_DISABLED:
      return {
        icon: "alert",
        accentClass: "bg-destructive/10 text-destructive",
      };
    default:
      return {
        icon: "alert",
        accentClass: "bg-muted text-muted-foreground",
      };
  }
}
