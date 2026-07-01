// Purge stale in-app notifications (N8).

import "server-only";

import { prisma } from "@/lib/prisma";
import {
  getNotificationRetentionCutoffs,
  getNotificationRetentionPolicy,
} from "@/lib/notification-retention";

export interface NotificationRetentionStats {
  readDeleted: number;
  unreadDeleted: number;
  totalDeleted: number;
  readRetentionDays: number;
  unreadRetentionDays: number;
}

/**
 * Delete notification rows past the retention window.
 * Read rows use `readAt`; unread rows use `createdAt`.
 */
export async function purgeStaleNotifications(
  now = new Date(),
): Promise<NotificationRetentionStats> {
  const policy = getNotificationRetentionPolicy();
  const cutoffs = getNotificationRetentionCutoffs(now, policy);

  const [readResult, unreadResult] = await Promise.all([
    prisma.notification.deleteMany({
      where: {
        readAt: { not: null, lt: cutoffs.readBefore },
      },
    }),
    prisma.notification.deleteMany({
      where: {
        readAt: null,
        createdAt: { lt: cutoffs.unreadBefore },
      },
    }),
  ]);

  return {
    readDeleted: readResult.count,
    unreadDeleted: unreadResult.count,
    totalDeleted: readResult.count + unreadResult.count,
    readRetentionDays: policy.readRetentionDays,
    unreadRetentionDays: policy.unreadRetentionDays,
  };
}
