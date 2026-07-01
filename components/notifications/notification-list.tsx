import Link from "next/link";
import { Bell } from "lucide-react";

import {
  notificationEmptyStateCopy,
  notificationInboxHref,
  notificationsPageHref,
  type NotificationInboxFilters,
} from "@/lib/notifications";
import type { Role } from "@/lib/generated/prisma/enums";
import type { NotificationListItem } from "@/lib/notifications";
import { EmptyState } from "@/components/ui/empty-state";
import { NotificationPaginationNav } from "@/components/notifications/notification-pagination-nav";
import { NotificationRow } from "@/components/notifications/notification-row";

/** Paginated notification inbox for student/teacher/admin roles. */
export function NotificationList({
  role,
  items,
  unreadCount,
  filters,
  pagination,
}: {
  role: Role;
  items: NotificationListItem[];
  unreadCount: number;
  filters: NotificationInboxFilters;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}) {
  if (items.length === 0) {
    const empty = notificationEmptyStateCopy(role, filters);
    return (
      <EmptyState
        icon={Bell}
        title={empty.title}
        description={empty.description}
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

      {unreadCount > 0 && filters.read === "all" && (
        <p className="border-t border-border px-5 py-3 text-xs text-muted-foreground">
          {unreadCount} unread notification{unreadCount === 1 ? "" : "s"} total
        </p>
      )}

      <NotificationPaginationNav
        role={role}
        filters={filters}
        page={pagination.page}
        pageSize={pagination.pageSize}
        total={pagination.total}
        totalPages={pagination.totalPages}
      />
    </>
  );
}

/** Compact list for the header dropdown. */
export function NotificationDropdownList({
  role,
  items,
  onItemRead,
}: {
  role: Role;
  items: NotificationListItem[];
  onItemRead?: () => void;
}) {
  const viewAllHref = notificationsPageHref(role);

  if (items.length === 0) {
    const empty = notificationEmptyStateCopy(role, { type: null, read: "all" });
    return (
      <p className="px-3 py-6 text-center text-sm text-muted-foreground">
        {empty.description}
      </p>
    );
  }

  return (
    <ul className="max-h-80 overflow-y-auto">
      {items.map((item) => (
        <li key={item.id} className="border-b border-border last:border-b-0">
          <NotificationRow item={item} compact onRead={onItemRead} />
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
