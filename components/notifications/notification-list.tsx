import Link from "next/link";
import { Bell } from "lucide-react";

import {
  notificationsPageHref,
} from "@/lib/notifications";
import type { Role } from "@/lib/generated/prisma/enums";
import type { NotificationListItem } from "@/lib/notifications";
import { EmptyState } from "@/components/ui/empty-state";
import { PaginationNav } from "@/components/ui/pagination-nav";
import { NotificationRow } from "@/components/notifications/notification-row";

/** Paginated notification inbox for student/admin roles. */
export function NotificationList({
  role,
  items,
  unreadCount,
  pagination,
}: {
  role: Role;
  items: NotificationListItem[];
  unreadCount: number;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}) {
  const basePath = notificationsPageHref(role);

  if (items.length === 0) {
    return (
      <EmptyState
        icon={Bell}
        title="No notifications"
        description="You're all caught up. New alerts will appear here."
        className="border-0"
      />
    );
  }

  return (
    <>
      <ul className="divide-y divide-border">
        {items.map((item) => (
          <li key={item.id}>
            <NotificationRow item={item} />
          </li>
        ))}
      </ul>

      {unreadCount > 0 && (
        <p className="border-t border-border px-5 py-3 text-xs text-muted-foreground">
          {unreadCount} unread notification{unreadCount === 1 ? "" : "s"}
        </p>
      )}

      {basePath && (
        <PaginationNav
          basePath={basePath}
          page={pagination.page}
          pageSize={pagination.pageSize}
          total={pagination.total}
          totalPages={pagination.totalPages}
        />
      )}
    </>
  );
}

/** Compact list for the header dropdown. */
export function NotificationDropdownList({
  role,
  items,
}: {
  role: Role;
  items: NotificationListItem[];
}) {
  const viewAllHref = notificationsPageHref(role);

  if (items.length === 0) {
    return (
      <p className="px-3 py-6 text-center text-sm text-muted-foreground">
        No notifications yet.
      </p>
    );
  }

  return (
    <ul className="max-h-80 overflow-y-auto">
      {items.map((item) => (
        <li key={item.id} className="border-b border-border last:border-b-0">
          <NotificationRow item={item} compact />
        </li>
      ))}
      {viewAllHref && (
        <li className="p-2">
          <Link
            href={viewAllHref}
            className="block rounded-md px-2 py-2 text-center text-sm font-medium text-primary hover:bg-accent"
          >
            View all notifications
          </Link>
        </li>
      )}
    </ul>
  );
}
