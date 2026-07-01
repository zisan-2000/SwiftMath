import type { Metadata } from "next";

import { requireRole } from "@/lib/session";
import { Role } from "@/lib/generated/prisma/enums";
import { NotificationsInboxShell } from "@/components/notifications/notifications-inbox-shell";

export const metadata: Metadata = {
  title: "Notifications",
};

export default async function TeacherNotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; type?: string; read?: string }>;
}) {
  const teacher = await requireRole(Role.TEACHER);

  return (
    <NotificationsInboxShell
      user={teacher}
      role={Role.TEACHER}
      searchParams={searchParams}
      subtitle="Alerts about your groups and students."
      cardTitle="Your inbox"
    />
  );
}
