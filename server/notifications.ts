// Trusted in-app notification writes and user-scoped reads.

import "server-only";

import { prisma } from "@/lib/prisma";
import {
  buildBankOnlyBlockedNotification,
  buildExamScheduledNotification,
  buildLevelUpNotification,
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
}

/** Append one notification. Failures are logged but never block the main mutation. */
async function createNotification(input: CreateNotificationInput): Promise<void> {
  try {
    await prisma.notification.create({ data: input });
  } catch (error) {
    console.error("[notifications] failed to create notification", error);
  }
}

/** Batch-create identical notifications for many users. */
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
