import "server-only";

import { Role } from "@/lib/generated/prisma/enums";
import type { NotificationSummaryPayload } from "@/lib/notification-poll";
import {
  getUnreadNotificationCount,
  listRecentNotifications,
} from "@/server/notifications";
import { getStudentPendingScheduledExam } from "@/server/scheduled-exam";

interface NotificationSummaryUser {
  id: string;
  role: Role;
  instituteId: string;
}

/** Shared bell + nav badge payload for polling and SSR hydration. */
export async function getNotificationSummaryPayload(
  user: NotificationSummaryUser,
): Promise<NotificationSummaryPayload> {
  const [unreadCount, recent] = await Promise.all([
    getUnreadNotificationCount(user.id, user.instituteId),
    listRecentNotifications(user.id, user.instituteId),
  ]);

  const payload: NotificationSummaryPayload = {
    unreadCount,
    recent: recent.map((item) => ({
      id: item.id,
      type: item.type,
      title: item.title,
      body: item.body,
      href: item.href,
      readAt: item.readAt?.toISOString() ?? null,
      createdAt: item.createdAt.toISOString(),
    })),
  };

  if (user.role === Role.STUDENT) {
    const pendingExam = await getStudentPendingScheduledExam(user.id);
    payload.hasPendingExam = pendingExam != null;
  }

  return payload;
}
