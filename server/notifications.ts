// Trusted in-app notification writes and user-scoped reads.

import "server-only";

import { prisma } from "@/lib/prisma";
import {
  buildBankOnlyBlockedNotification,
  buildBankPartialWarningNotification,
  buildCurriculumBumpedNotification,
  buildExamCancelledNotification,
  buildExamClosedSummaryNotification,
  buildExamClosingSoonNotification,
  buildExamOpenNotification,
  buildExamScheduledNotification,
  buildGroupBankBlockedNotification,
  buildGroupQuestionDisabledAdminNotification,
  buildLevelAssignedNotification,
  buildLevelUpNotification,
  buildStudentJoinedGroupNotification,
  notificationDedupeKeys,
  type NotificationListItem,
  type NotificationMetadata,
} from "@/lib/notifications";
import type { Prisma } from "@/lib/generated/prisma/client";
import {
  EXAM_CLOSING_SOON_MS,
  EXAM_CLOSED_SUMMARY_LOOKBACK_MS,
} from "@/lib/exam-window";
import { assessLevelBankCoverage } from "@/lib/question-bank";
import {
  buildPaginatedList,
  DEFAULT_PAGE_SIZE,
  paginationBounds,
  type PaginatedList,
} from "@/lib/pagination";
import { NotificationType, Role } from "@/lib/generated/prisma/enums";
import type { AdminContext } from "@/server/admin";
import type { StudentContext } from "@/server/practice";
import { getLevelBankStats } from "@/server/question-bank";

export type { NotificationListItem };

export interface ListUserNotificationsOptions {
  page?: number;
  pageSize?: number;
  type?: NotificationType | null;
  read?: "all" | "unread";
}

interface CreateNotificationInput {
  instituteId: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  href: string;
  dedupeKey?: string;
  metadata?: NotificationMetadata;
  actorUserId?: string;
}

function metadataJson(
  metadata: NotificationMetadata | undefined,
): Prisma.InputJsonValue | undefined {
  return metadata as Prisma.InputJsonValue | undefined;
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}

/** Append one notification. Failures are logged but never block the main mutation. */
async function createNotification(input: CreateNotificationInput): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        instituteId: input.instituteId,
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        href: input.href,
        dedupeKey: input.dedupeKey,
        metadata: metadataJson(input.metadata),
        actorUserId: input.actorUserId,
      },
    });
  } catch (error) {
    if (input.dedupeKey && isUniqueViolation(error)) {
      return;
    }
    console.error("[notifications] failed to create notification", error);
  }
}

/**
 * Create or refresh a deduped notification (e.g. reschedule, bank shrink update).
 * Resets readAt so important updates surface again in the bell.
 */
async function upsertNotification(input: CreateNotificationInput): Promise<void> {
  if (!input.dedupeKey) {
    await createNotification(input);
    return;
  }

  const data = {
    instituteId: input.instituteId,
    userId: input.userId,
    type: input.type,
    title: input.title,
    body: input.body,
    href: input.href,
    dedupeKey: input.dedupeKey,
    metadata: metadataJson(input.metadata),
    actorUserId: input.actorUserId,
  };

  try {
    await prisma.notification.upsert({
      where: {
        userId_dedupeKey: {
          userId: input.userId,
          dedupeKey: input.dedupeKey,
        },
      },
      create: data,
      update: {
        type: data.type,
        title: data.title,
        body: data.body,
        href: data.href,
        metadata: data.metadata,
        actorUserId: data.actorUserId,
        readAt: null,
        createdAt: new Date(),
      },
    });
  } catch (error) {
    console.error("[notifications] failed to upsert notification", error);
  }
}

async function listActiveGroupStudentIds(
  instituteId: string,
  groupId: string,
): Promise<string[]> {
  const students = await prisma.user.findMany({
    where: {
      instituteId,
      groupId,
      role: Role.STUDENT,
      isActive: true,
    },
    select: { id: true },
  });
  return students.map((student) => student.id);
}

/** Drop stale exam alerts so sync/reschedule can re-fire cleanly (N5.3). */
async function removeExamStudentSyncNotifications(
  instituteId: string,
  examId: string,
  studentIds: string[],
): Promise<void> {
  if (studentIds.length === 0) return;

  await prisma.notification.deleteMany({
    where: {
      instituteId,
      userId: { in: studentIds },
      dedupeKey: {
        in: [
          notificationDedupeKeys.examScheduled(examId),
          notificationDedupeKeys.examOpen(examId),
          notificationDedupeKeys.examClosingSoon(examId),
        ],
      },
    },
  });
}

/** Minimal exam fields for S2 / S3 student alerts. */
export interface ExamStudentAlert {
  id: string;
  title: string | null;
  closesAt: Date;
  level: { name: string };
}

/** S2 — one student, one open exam (deduped). Used by page sync + N6 cron. */
export async function deliverExamOpenNotification(
  instituteId: string,
  studentId: string,
  exam: ExamStudentAlert,
): Promise<void> {
  const content = buildExamOpenNotification({
    examTitle: exam.title,
    levelName: exam.level.name,
    closesAt: exam.closesAt,
  });
  await createNotification({
    instituteId,
    userId: studentId,
    type: NotificationType.EXAM_OPEN,
    dedupeKey: notificationDedupeKeys.examOpen(exam.id),
    metadata: { examId: exam.id },
    ...content,
  });
}

/** S3 — one student, exam closing within one hour (deduped). */
export async function deliverExamClosingSoonNotification(
  instituteId: string,
  studentId: string,
  exam: ExamStudentAlert,
): Promise<void> {
  const content = buildExamClosingSoonNotification({
    examTitle: exam.title,
    levelName: exam.level.name,
    closesAt: exam.closesAt,
  });
  await createNotification({
    instituteId,
    userId: studentId,
    type: NotificationType.EXAM_CLOSING_SOON,
    dedupeKey: notificationDedupeKeys.examClosingSoon(exam.id),
    metadata: { examId: exam.id },
    ...content,
  });
}

/** T2 — teacher summary after an exam closes (deduped). */
export async function deliverExamClosedSummaryNotification(
  instituteId: string,
  teacherId: string,
  input: {
    examId: string;
    examTitle: string | null;
    levelName: string;
    groupName: string;
    groupId: string;
    attemptedCount: number;
    studentCount: number;
  },
): Promise<void> {
  const content = buildExamClosedSummaryNotification({
    examTitle: input.examTitle,
    levelName: input.levelName,
    groupName: input.groupName,
    groupId: input.groupId,
    attemptedCount: input.attemptedCount,
    studentCount: input.studentCount,
  });
  await createNotification({
    instituteId,
    userId: teacherId,
    type: NotificationType.EXAM_CLOSED_SUMMARY,
    dedupeKey: notificationDedupeKeys.examClosed(input.examId),
    metadata: { examId: input.examId, groupId: input.groupId },
    ...content,
  });
}

/** Unread count for the header bell badge. */
export async function getUnreadNotificationCount(
  userId: string,
  instituteId: string,
): Promise<number> {
  return prisma.notification.count({
    where: { userId, instituteId, readAt: null },
  });
}

/** Recent notifications for the header dropdown (newest first). */
export async function listRecentNotifications(
  userId: string,
  instituteId: string,
  limit = 8,
): Promise<NotificationListItem[]> {
  return prisma.notification.findMany({
    where: { userId, instituteId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      type: true,
      title: true,
      body: true,
      href: true,
      readAt: true,
      createdAt: true,
    },
  });
}

/** Paginated inbox for the full notifications page. */
export async function listUserNotifications(
  userId: string,
  instituteId: string,
  options: ListUserNotificationsOptions = {},
): Promise<PaginatedList<NotificationListItem>> {
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;
  const { skip, take, page: safePage, pageSize: safeSize } = paginationBounds(
    page,
    pageSize,
  );

  const where = {
    userId,
    instituteId,
    ...(options.type ? { type: options.type } : {}),
    ...(options.read === "unread" ? { readAt: null } : {}),
  };

  const [total, items] = await Promise.all([
    prisma.notification.count({ where }),
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      select: {
        id: true,
        type: true,
        title: true,
        body: true,
        href: true,
        readAt: true,
        createdAt: true,
      },
    }),
  ]);

  return buildPaginatedList(items, total, safePage, safeSize);
}

/** Mark one notification read if it belongs to the signed-in user. */
export async function markNotificationRead(
  userId: string,
  instituteId: string,
  notificationId: string,
): Promise<boolean> {
  const result = await prisma.notification.updateMany({
    where: { id: notificationId, userId, instituteId, readAt: null },
    data: { readAt: new Date() },
  });
  return result.count > 0;
}

/** Mark every unread notification read for the signed-in user. */
export async function markAllNotificationsRead(
  userId: string,
  instituteId: string,
): Promise<number> {
  const result = await prisma.notification.updateMany({
    where: { userId, instituteId, readAt: null },
    data: { readAt: new Date() },
  });
  return result.count;
}

/** S1 — notify every active student in the exam's group. */
export async function notifyExamScheduled(
  instituteId: string,
  scheduledExamId: string,
): Promise<void> {
  const exam = await prisma.scheduledExam.findFirst({
    where: { id: scheduledExamId, instituteId },
    select: {
      title: true,
      opensAt: true,
      closesAt: true,
      createdById: true,
      group: { select: { id: true, name: true } },
      level: { select: { id: true, name: true } },
      createdBy: { select: { name: true } },
    },
  });
  if (!exam) return;

  const studentIds = await listActiveGroupStudentIds(instituteId, exam.group.id);
  const actorName = exam.createdBy.name;
  const metadata: NotificationMetadata = {
    examId: scheduledExamId,
    groupId: exam.group.id,
    levelId: exam.level.id,
    actorName,
  };

  const content = buildExamScheduledNotification({
    examTitle: exam.title,
    levelName: exam.level.name,
    groupName: exam.group.name,
    opensAt: exam.opensAt,
    closesAt: exam.closesAt,
    actorName,
  });

  const dedupeKey = notificationDedupeKeys.examScheduled(scheduledExamId);

  for (const userId of studentIds) {
    await upsertNotification({
      instituteId,
      userId,
      type: NotificationType.EXAM_SCHEDULED,
      dedupeKey,
      metadata,
      actorUserId: exam.createdById,
      ...content,
    });
  }
}

/** N5.3 — refresh scheduled-exam alerts after a teacher reschedules. */
export async function notifyExamRescheduled(
  instituteId: string,
  scheduledExamId: string,
): Promise<void> {
  const exam = await prisma.scheduledExam.findFirst({
    where: { id: scheduledExamId, instituteId },
    select: { groupId: true },
  });
  if (!exam) return;

  const studentIds = await listActiveGroupStudentIds(instituteId, exam.groupId);
  await removeExamStudentSyncNotifications(
    instituteId,
    scheduledExamId,
    studentIds,
  );
  await notifyExamScheduled(instituteId, scheduledExamId);
}

/** N5.3 — notify students when a scheduled exam is cancelled. */
export async function notifyExamCancelled(
  instituteId: string,
  scheduledExamId: string,
  input: {
    examTitle: string | null;
    levelName: string;
    groupId: string;
    groupName: string;
    actorUserId: string;
    actorName: string;
  },
): Promise<void> {
  const studentIds = await listActiveGroupStudentIds(instituteId, input.groupId);
  await removeExamStudentSyncNotifications(
    instituteId,
    scheduledExamId,
    studentIds,
  );

  const content = buildExamCancelledNotification({
    examTitle: input.examTitle,
    levelName: input.levelName,
    groupName: input.groupName,
    actorName: input.actorName,
  });
  const metadata: NotificationMetadata = {
    examId: scheduledExamId,
    groupId: input.groupId,
    actorName: input.actorName,
  };
  const dedupeKey = notificationDedupeKeys.examCancelled(scheduledExamId);

  for (const userId of studentIds) {
    await upsertNotification({
      instituteId,
      userId,
      type: NotificationType.EXAM_CANCELLED,
      dedupeKey,
      metadata,
      actorUserId: input.actorUserId,
      ...content,
    });
  }
}

/**
 * S2 + S3 — safety-net sync on student page load.
 * Primary delivery is `runScheduledExamNotificationCron` (N6).
 */
export async function syncStudentScheduledExamNotifications(
  studentId: string,
  instituteId: string,
): Promise<void> {
  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: { groupId: true, role: true, isActive: true },
  });
  if (!student?.groupId || student.role !== Role.STUDENT || !student.isActive) {
    return;
  }

  const now = new Date();
  const oneHourFromNow = new Date(now.getTime() + EXAM_CLOSING_SOON_MS);

  const openExams = await prisma.scheduledExam.findMany({
    where: {
      instituteId,
      groupId: student.groupId,
      opensAt: { lte: now },
      closesAt: { gte: now },
    },
    select: {
      id: true,
      title: true,
      closesAt: true,
      level: { select: { name: true } },
    },
  });

  for (const exam of openExams) {
    await deliverExamOpenNotification(instituteId, studentId, exam);

    if (exam.closesAt.getTime() <= oneHourFromNow.getTime()) {
      await deliverExamClosingSoonNotification(instituteId, studentId, exam);
    }
  }
}

/** @deprecated Use syncStudentScheduledExamNotifications */
export async function syncExamOpenNotificationsForStudent(
  studentId: string,
  instituteId: string,
): Promise<void> {
  await syncStudentScheduledExamNotifications(studentId, instituteId);
}

/**
 * T2 — safety-net sync on teacher dashboard load.
 * Primary delivery is `runScheduledExamNotificationCron` (N6).
 */
export async function syncTeacherExamClosedNotifications(
  teacherId: string,
  instituteId: string,
): Promise<void> {
  const now = new Date();
  const lookbackStart = new Date(now.getTime() - EXAM_CLOSED_SUMMARY_LOOKBACK_MS);

  const closedExams = await prisma.scheduledExam.findMany({
    where: {
      instituteId,
      closesAt: { lte: now, gte: lookbackStart },
      group: { teacherId },
    },
    select: {
      id: true,
      title: true,
      groupId: true,
      group: { select: { name: true } },
      level: { select: { name: true } },
    },
  });

  for (const exam of closedExams) {
    const [studentCount, attemptedCount] = await Promise.all([
      prisma.user.count({
        where: {
          instituteId,
          groupId: exam.groupId,
          role: Role.STUDENT,
          isActive: true,
        },
      }),
      prisma.practiceSession.count({
        where: { scheduledExamId: exam.id },
      }),
    ]);

    await deliverExamClosedSummaryNotification(instituteId, teacherId, {
      examId: exam.id,
      examTitle: exam.title,
      levelName: exam.level.name,
      groupName: exam.group.name,
      groupId: exam.groupId,
      attemptedCount,
      studentCount,
    });
  }
}

/** T3 — alert the group's teacher when bank-only practice cannot start. */
export async function notifyTeacherGroupBankBlocked(input: {
  instituteId: string;
  studentId: string;
  levelId: string;
  levelName: string;
  available: number;
  required: number;
}): Promise<void> {
  const student = await prisma.user.findUnique({
    where: { id: input.studentId },
    select: {
      group: {
        select: { id: true, name: true, teacherId: true },
      },
    },
  });
  if (!student?.group) return;

  const content = buildGroupBankBlockedNotification({
    groupName: student.group.name,
    groupId: student.group.id,
    levelName: input.levelName,
    available: input.available,
    required: input.required,
  });

  await createNotification({
    instituteId: input.instituteId,
    userId: student.group.teacherId,
    type: NotificationType.GROUP_BANK_BLOCKED,
    dedupeKey: notificationDedupeKeys.groupBankBlocked(
      student.group.id,
      input.levelId,
    ),
    ...content,
  });
}

/** A3 — notify institute admins when a teacher disables a group question. */
export async function notifyAdminsGroupQuestionDisabled(input: {
  instituteId: string;
  teacherName: string;
  groupId: string;
  groupName: string;
  levelName: string;
  questionId: string;
  prompt: string;
}): Promise<void> {
  const admins = await prisma.user.findMany({
    where: { instituteId: input.instituteId, role: Role.ADMIN, isActive: true },
    select: { id: true },
  });

  const content = buildGroupQuestionDisabledAdminNotification(input);
  const dedupeKey = notificationDedupeKeys.groupQuestionDisabled(
    input.groupId,
    input.questionId,
  );
  const metadata: NotificationMetadata = {
    groupId: input.groupId,
    questionId: input.questionId,
    actorName: input.teacherName,
  };

  for (const admin of admins) {
    await createNotification({
      instituteId: input.instituteId,
      userId: admin.id,
      type: NotificationType.GROUP_QUESTION_DISABLED,
      dedupeKey,
      metadata,
      ...content,
    });
  }
}

/** A4 — notify institute admins after a curriculum version bump. */
export async function notifyInstituteAdminsCurriculumBumped(input: {
  instituteId: string;
  versionId: string;
  versionNumber: number;
  label: string | null;
}): Promise<void> {
  const admins = await prisma.user.findMany({
    where: { instituteId: input.instituteId, role: Role.ADMIN, isActive: true },
    select: { id: true },
  });

  const content = buildCurriculumBumpedNotification({
    versionNumber: input.versionNumber,
    label: input.label,
  });
  const dedupeKey = notificationDedupeKeys.curriculumBumped(input.versionId);

  for (const admin of admins) {
    await createNotification({
      instituteId: input.instituteId,
      userId: admin.id,
      type: NotificationType.CURRICULUM_BUMPED,
      dedupeKey,
      ...content,
    });
  }
}

/** S4 — notify a student after they level up. */
export async function notifyStudentLevelUp(
  student: StudentContext,
  input: { levelId: string; levelName: string },
): Promise<void> {
  const content = buildLevelUpNotification({ levelName: input.levelName });
  await createNotification({
    instituteId: student.instituteId,
    userId: student.id,
    type: NotificationType.LEVEL_UP,
    dedupeKey: notificationDedupeKeys.levelUp(student.id, input.levelId),
    metadata: { levelId: input.levelId },
    ...content,
  });
}

/** S5 — notify a student when their level is assigned by staff. */
export async function notifyStudentLevelAssigned(input: {
  studentId: string;
  instituteId: string;
  levelId: string;
  levelName: string;
}): Promise<void> {
  const content = buildLevelAssignedNotification({ levelName: input.levelName });
  await createNotification({
    instituteId: input.instituteId,
    userId: input.studentId,
    type: NotificationType.LEVEL_ASSIGNED,
    dedupeKey: notificationDedupeKeys.levelAssigned(
      input.studentId,
      input.levelId,
    ),
    ...content,
  });
}

/** T1 — notify a teacher when a student joins their group. */
export async function notifyTeacherStudentJoined(input: {
  instituteId: string;
  teacherId: string;
  groupId: string;
  groupName: string;
  studentId: string;
  studentName: string;
}): Promise<void> {
  const content = buildStudentJoinedGroupNotification({
    studentName: input.studentName,
    groupName: input.groupName,
    groupId: input.groupId,
  });
  await createNotification({
    instituteId: input.instituteId,
    userId: input.teacherId,
    type: NotificationType.STUDENT_JOINED_GROUP,
    dedupeKey: notificationDedupeKeys.studentJoinedGroup(
      input.groupId,
      input.studentId,
    ),
    ...content,
  });
}

/** A1 — notify every active institute admin when bank-only blocks practice. */
export async function notifyInstituteAdminsBankOnlyBlocked(
  instituteId: string,
  input: { levelId: string; levelName: string; detail: string },
): Promise<void> {
  const admins = await prisma.user.findMany({
    where: { instituteId, role: Role.ADMIN, isActive: true },
    select: { id: true },
  });

  const content = buildBankOnlyBlockedNotification(input);
  const dedupeKey = notificationDedupeKeys.bankOnlyBlocked(input.levelId);
  const metadata: NotificationMetadata = { levelId: input.levelId };

  for (const admin of admins) {
    await upsertNotification({
      instituteId,
      userId: admin.id,
      type: NotificationType.BANK_ONLY_BLOCKED,
      dedupeKey,
      metadata,
      ...content,
    });
  }
}

/** A2 — notify institute admins when hybrid bank coverage is partial. */
export async function notifyInstituteAdminsBankPartialWarning(
  instituteId: string,
  input: { levelId: string; levelName: string; detail: string },
): Promise<void> {
  const admins = await prisma.user.findMany({
    where: { instituteId, role: Role.ADMIN, isActive: true },
    select: { id: true },
  });

  const content = buildBankPartialWarningNotification(input);
  const dedupeKey = notificationDedupeKeys.bankPartial(input.levelId);
  const metadata: NotificationMetadata = { levelId: input.levelId };

  for (const admin of admins) {
    await upsertNotification({
      instituteId,
      userId: admin.id,
      type: NotificationType.BANK_PARTIAL_WARNING,
      dedupeKey,
      metadata,
      ...content,
    });
  }
}

/**
 * A1 helper — warn admins when bank-only coverage is blocked.
 * Safe to call on toggle, bank shrink, or question-count changes (N5.2).
 */
export async function maybeNotifyBankOnlyBlocked(
  admin: AdminContext,
  levelId: string,
): Promise<void> {
  const level = await prisma.level.findFirst({
    where: { id: levelId, instituteId: admin.instituteId },
    select: { name: true, questionCount: true, bankOnly: true },
  });
  if (!level?.bankOnly) return;

  const stats = await getLevelBankStats(admin, levelId);
  if (!stats) return;

  const coverage = assessLevelBankCoverage({
    sessionQuestionCount: level.questionCount,
    totalBankCount: stats.totalBankCount,
    activeBankCount: stats.activeBankCount,
    bankOnly: true,
  });

  if (coverage.status !== "blocked") return;

  await notifyInstituteAdminsBankOnlyBlocked(admin.instituteId, {
    levelId,
    levelName: level.name,
    detail: coverage.detail,
  });
}

/**
 * A2 helper — warn admins when bank-only is off but active bank is smaller than
 * session size (hybrid dynamic fill).
 */
export async function maybeNotifyBankPartialWarning(
  admin: AdminContext,
  levelId: string,
): Promise<void> {
  const level = await prisma.level.findFirst({
    where: { id: levelId, instituteId: admin.instituteId },
    select: { name: true, questionCount: true, bankOnly: true },
  });
  if (!level || level.bankOnly) return;

  const stats = await getLevelBankStats(admin, levelId);
  if (!stats) return;

  const coverage = assessLevelBankCoverage({
    sessionQuestionCount: level.questionCount,
    totalBankCount: stats.totalBankCount,
    activeBankCount: stats.activeBankCount,
    bankOnly: false,
  });

  if (coverage.status !== "partial") return;

  await notifyInstituteAdminsBankPartialWarning(admin.instituteId, {
    levelId,
    levelName: level.name,
    detail: coverage.detail,
  });
}
