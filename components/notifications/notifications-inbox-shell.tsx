import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell, Settings } from "lucide-react";

import type { Role } from "@/lib/generated/prisma/enums";
import {
  notificationInboxHref,
  parseNotificationReadFilter,
  parseNotificationTypeFilter,
  type NotificationInboxFilters,
} from "@/lib/notifications";
import { parsePageParam } from "@/lib/pagination";
import { roleHomePath } from "@/lib/roles";
import { loadNotificationsInboxData } from "@/server/notifications-page";
import type { InstituteBranding } from "@/server/institute-branding";
import { BackLink } from "@/components/nav/back-link";
import { NotificationsPageShell } from "@/components/notifications/notifications-page-shell";
import { MarkAllReadButton } from "@/components/notifications/mark-all-read-button";
import { NotificationInboxFilters as NotificationInboxFilterBar } from "@/components/notifications/notification-inbox-filters";
import { NotificationList } from "@/components/notifications/notification-list";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface NotificationsInboxShellProps {
  user: {
    id: string;
    name: string;
    role: Role;
    instituteId: string;
  };
  institute: InstituteBranding | null;
  role: Role;
  searchParams: Promise<{ page?: string; type?: string; read?: string }>;
  subtitle: string;
  cardTitle: string;
}

/** Shared notifications inbox for student, teacher, admin, and super admin. */
export async function NotificationsInboxShell({
  user,
  institute,
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

  const { notifications, unreadCount } = await loadNotificationsInboxData(
    user,
    filters,
  );

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
    <NotificationsPageShell
      user={user}
      institute={institute}
      subtitle={subtitle}
      actions={<MarkAllReadButton disabled={unreadCount === 0} />}
    >
      <BackLink href={roleHomePath(role)}>Back to dashboard</BackLink>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard label="Unread" value={unreadCount} icon={Bell} />
        <StatCard
          label="In this view"
          value={notifications.total}
          hint={
            filters.read === "unread"
              ? "Unread only"
              : filters.type
                ? "Filtered by type"
                : "All notifications"
          }
          icon={Bell}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href="/account">
            <Settings className="h-3.5 w-3.5" />
            Notification settings
          </Link>
        </Button>
      </div>

      <Card className="mt-6 overflow-hidden">
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
    </NotificationsPageShell>
  );
}
