// Cached loaders for notification inbox pages.

import "server-only";

import { cache } from "react";

import type { NotificationInboxFilters } from "@/lib/notifications";
import {
  getUnreadNotificationCount,
  listUserNotifications,
} from "@/server/notifications";

interface InboxUser {
  id: string;
  instituteId: string;
}

/** Paginated inbox rows + unread total for the notifications page. */
export const loadNotificationsInboxData = cache(
  async (user: InboxUser, filters: NotificationInboxFilters) => {
    const [notifications, unreadCount] = await Promise.all([
      listUserNotifications(user.id, user.instituteId, filters),
      getUnreadNotificationCount(user.id, user.instituteId),
    ]);
    return { notifications, unreadCount };
  },
);
