import type { Metadata } from "next";

import { requireRole } from "@/lib/session";
import { Role } from "@/lib/generated/prisma/enums";
import { NotificationsInboxShell } from "@/components/notifications/notifications-inbox-shell";

export const metadata: Metadata = {
  title: "Notifications",
};

export default async function StudentNotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; type?: string; read?: string }>;
}) {
  const student = await requireRole(Role.STUDENT);

  return (
    <NotificationsInboxShell
      user={student}
      role={Role.STUDENT}
      searchParams={searchParams}
      subtitle="Exam schedules, level-ups, and other alerts for your account."
      cardTitle="Your inbox"
    />
  );
}
