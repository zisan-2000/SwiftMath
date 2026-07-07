import type { Metadata } from "next";

import { Role } from "@/lib/generated/prisma/enums";
import { loadStudentPageContext } from "@/server/student-page";
import { NotificationsInboxShell } from "@/components/notifications/notifications-inbox-shell";

export const metadata: Metadata = {
  title: "Notifications",
};

export default async function StudentNotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; type?: string; read?: string }>;
}) {
  const { student, institute } = await loadStudentPageContext();

  return (
    <NotificationsInboxShell
      user={student}
      institute={institute}
      role={Role.STUDENT}
      searchParams={searchParams}
      subtitle="Exam schedules, level-ups, and other alerts for your account."
      cardTitle="Your inbox"
    />
  );
}
