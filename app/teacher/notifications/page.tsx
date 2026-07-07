import type { Metadata } from "next";

import { Role } from "@/lib/generated/prisma/enums";
import { loadTeacherPageContext } from "@/server/teacher-page";
import { NotificationsInboxShell } from "@/components/notifications/notifications-inbox-shell";

export const metadata: Metadata = {
  title: "Notifications",
};

export default async function TeacherNotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; type?: string; read?: string }>;
}) {
  const { teacher, institute } = await loadTeacherPageContext();

  return (
    <NotificationsInboxShell
      user={teacher}
      institute={institute}
      role={Role.TEACHER}
      searchParams={searchParams}
      subtitle="Alerts about your groups and students."
      cardTitle="Your inbox"
    />
  );
}
