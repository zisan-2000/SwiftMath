// Trusted in-app notification writes and user-scoped reads.

import "server-only";

import { prisma } from "@/lib/prisma";
import {
  buildBankOnlyBlockedNotification,
  buildBankPartialWarningNotification,
  buildCurriculumBumpedNotification,
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
} from "@/lib/notifications";
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

interface CreateNotificationInput {
  instituteId: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  href: string;
  dedupeKey?: string;
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
    await prisma.notification.create({ data: input });
  } catch (error) {
    if (input.dedupeKey && isUniqueViolation(error)) {
      return;
    }
    console.error("[notifications] failed to create notification", error);
  }
}

/** Batch-create identical notifications for many users (no dedupe). */
async function createNotificationsForUsers(
  userIds: string[],
  data: Omit<CreateNotificationInput, "userId">,
): Promise<void> {
  if (userIds.length === 0) return;

  try {
    await prisma.notification.createMany({
      data: userIds.map((userId) => ({ ...data, userId })),
    });
  } catch (error) {
    console.error("[notifications] failed to batch-create notifications", error);
  }
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
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
): Promise<PaginatedList<NotificationListItem>> {
  const { skip, take, page: safePage, pageSize: safeSize } = paginationBounds(
    page,
    pageSize,
  );

  const where = { userId, instituteId };

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
      group: { select: { id: true, name: true } },
      level: { select: { name: true } },
    },
  });
  if (!exam) return;

  const students = await prisma.user.findMany({
    where: {
      instituteId,
      groupId: exam.group.id,
      role: Role.STUDENT,
      isActive: true,
    },
    select: { id: true },
  });

  const content = buildExamScheduledNotification({
    examTitle: exam.title,
    levelName: exam.level.name,
    groupName: exam.group.name,
    opensAt: exam.opensAt,
    closesAt: exam.closesAt,
  });

  await createNotificationsForUsers(
    students.map((student) => student.id),
    {
      instituteId,
      type: NotificationType.EXAM_SCHEDULED,
      ...content,
    },
  );
}

/**
 * S2 + S3 — sync open-exam and closing-soon alerts on student page load.
 * Cron-free until N6.
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
  const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

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
    const openContent = buildExamOpenNotification({
      examTitle: exam.title,
      levelName: exam.level.name,
      closesAt: exam.closesAt,
    });
    await createNotification({
      instituteId,
      userId: studentId,
      type: NotificationType.EXAM_OPEN,
      dedupeKey: notificationDedupeKeys.examOpen(exam.id),
      ...openContent,
    });

    if (exam.closesAt.getTime() <= oneHourFromNow.getTime()) {
      const closingContent = buildExamClosingSoonNotification({
        examTitle: exam.title,
        levelName: exam.level.name,
        closesAt: exam.closesAt,
      });
      await createNotification({
        instituteId,
        userId: studentId,
        type: NotificationType.EXAM_CLOSING_SOON,
        dedupeKey: notificationDedupeKeys.examClosingSoon(exam.id),
        ...closingContent,
      });
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
 * T2 — notify a teacher about recently closed exams (page-load sync until N6).
 */
export async function syncTeacherExamClosedNotifications(
  teacherId: string,
  instituteId: string,
): Promise<void> {
  const now = new Date();
  const lookbackStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

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

    const content = buildExamClosedSummaryNotification({
      examTitle: exam.title,
      levelName: exam.level.name,
      groupName: exam.group.name,
      groupId: exam.groupId,
      attemptedCount,
      studentCount,
    });

    await createNotification({
      instituteId,
      userId: teacherId,
      type: NotificationType.EXAM_CLOSED_SUMMARY,
      dedupeKey: notificationDedupeKeys.examClosed(exam.id),
      ...content,
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
  groupName: string;
  levelName: string;
  prompt: string;
}): Promise<void> {
  const admins = await prisma.user.findMany({
    where: { instituteId: input.instituteId, role: Role.ADMIN, isActive: true },
    select: { id: true },
  });

  const content = buildGroupQuestionDisabledAdminNotification(input);

  await createNotificationsForUsers(
    admins.map((admin) => admin.id),
    {
      instituteId: input.instituteId,
      type: NotificationType.GROUP_QUESTION_DISABLED,
      ...content,
    },
  );
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

  await createNotificationsForUsers(
    admins.map((admin) => admin.id),
    {
      instituteId,
      type: NotificationType.BANK_ONLY_BLOCKED,
      ...content,
    },
  );
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

  for (const admin of admins) {
    await createNotification({
      instituteId,
      userId: admin.id,
      type: NotificationType.BANK_PARTIAL_WARNING,
      dedupeKey,
      ...content,
    });
  }
}

/**
 * A1 helper — after bank-only is enabled, warn admins if coverage is blocked.
 * Safe to call from level create/update actions.
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
