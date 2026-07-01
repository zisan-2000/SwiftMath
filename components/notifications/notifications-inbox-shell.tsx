import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import type { Role } from "@/lib/generated/prisma/enums";
import {
  notificationInboxHref,
  parseNotificationReadFilter,
  parseNotificationTypeFilter,
  type NotificationInboxFilters,
} from "@/lib/notifications";
import { parsePageParam } from "@/lib/pagination";
import {
  getUnreadNotificationCount,
  listUserNotifications,
} from "@/server/notifications";
import { AppShell } from "@/components/app-shell";
import { MarkAllReadButton } from "@/components/notifications/mark-all-read-button";
import { NotificationInboxFilters as NotificationInboxFilterBar } from "@/components/notifications/notification-inbox-filters";
import { NotificationList } from "@/components/notifications/notification-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface NotificationsInboxShellProps {
  user: {
    id: string;
    name: string;
    role: Role;
    instituteId: string;
  };
  role: Role;
  searchParams: Promise<{ page?: string; type?: string; read?: string }>;
  subtitle: string;
  cardTitle: string;
}

/** Shared notifications inbox page body for student, teacher, and admin. */
export async function NotificationsInboxShell({
  user,
  role,
  searchParams,
  subtitle,
  cardTitle,
}: NotificationsInboxShellProps) {
  const params = await searchParams;
  const page = parsePageParam(params.page);
  const type = parseNotificationTypeFilter(role, params.type);
  const read = parseNotificationReadFilter(params.read);
  const filters: NotificationInboxFilters = { page, type, read };

  const [institute, notifications, unreadCount] = await Promise.all([
    prisma.institute.findUnique({
      where: { id: user.instituteId },
      select: { name: true, logoUrl: true },
    }),
    listUserNotifications(user.id, user.instituteId, {
      page,
      type,
      read,
    }),
    getUnreadNotificationCount(user.id, user.instituteId),
  ]);

  if (page > notifications.totalPages && notifications.total > 0) {
    redirect(
      notificationInboxHref(role, {
        page: notifications.totalPages,
        type,
        read,
      })!,
    );
  }

  return (
    <AppShell
      user={user}
      instituteName={institute?.name ?? "Institute"}
      instituteLogoUrl={institute?.logoUrl}
      title="Notifications"
      subtitle={subtitle}
      actions={<MarkAllReadButton disabled={unreadCount === 0} />}
    >
      <Card className="overflow-hidden">
        <CardHeader className="border-b border-border">
          <CardTitle className="text-base">{cardTitle}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <NotificationInboxFilterBar role={role} filters={filters} />
          <NotificationList
            role={role}
            items={notifications.items}
            unreadCount={unreadCount}
            filters={filters}
            pagination={{
              page: notifications.page,
              pageSize: notifications.pageSize,
              total: notifications.total,
              totalPages: notifications.totalPages,
            }}
          />
        </CardContent>
      </Card>
    </AppShell>
  );
}
