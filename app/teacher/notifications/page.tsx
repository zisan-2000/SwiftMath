import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/generated/prisma/enums";
import { notificationsPageHref } from "@/lib/notifications";
import { parsePageParam } from "@/lib/pagination";
import {
  getUnreadNotificationCount,
  listUserNotifications,
} from "@/server/notifications";
import { AppShell } from "@/components/app-shell";
import { MarkAllReadButton } from "@/components/notifications/mark-all-read-button";
import { NotificationList } from "@/components/notifications/notification-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Notifications",
};

export default async function TeacherNotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const teacher = await requireRole(Role.TEACHER);
  const params = await searchParams;
  const page = parsePageParam(params.page);
  const inboxHref = notificationsPageHref(Role.TEACHER)!;

  const [institute, notifications, unreadCount] = await Promise.all([
    prisma.institute.findUnique({
      where: { id: teacher.instituteId },
      select: { name: true, logoUrl: true },
    }),
    listUserNotifications(teacher.id, teacher.instituteId, page),
    getUnreadNotificationCount(teacher.id, teacher.instituteId),
  ]);

  if (page > notifications.totalPages && notifications.total > 0) {
    redirect(
      page > 1 ? `${inboxHref}?page=${notifications.totalPages}` : inboxHref,
    );
  }

  return (
    <AppShell
      user={teacher}
      instituteName={institute?.name ?? "Institute"}
      instituteLogoUrl={institute?.logoUrl}
      title="Notifications"
      subtitle="Alerts about your groups and students."
      actions={<MarkAllReadButton disabled={unreadCount === 0} />}
    >
      <Card className="overflow-hidden">
        <CardHeader className="border-b border-border">
          <CardTitle className="text-base">Your inbox</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <NotificationList
            role={Role.TEACHER}
            items={notifications.items}
            unreadCount={unreadCount}
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
