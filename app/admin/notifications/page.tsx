import type { Metadata } from "next";

import { requireRole } from "@/lib/session";
import { Role } from "@/lib/generated/prisma/enums";
import { NotificationsInboxShell } from "@/components/notifications/notifications-inbox-shell";

export const metadata: Metadata = {
  title: "Notifications",
};

export default async function AdminNotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; type?: string; read?: string }>;
}) {
  const admin = await requireRole(Role.ADMIN);

  return (
    <NotificationsInboxShell
      user={admin}
      role={Role.ADMIN}
      searchParams={searchParams}
      subtitle="Institute alerts such as bank-only coverage issues."
      cardTitle="Admin inbox"
    />
  );
}
