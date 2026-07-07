import type { Metadata } from "next";

import { Role } from "@/lib/generated/prisma/enums";
import { loadAdminPageContext } from "@/server/admin-page";
import { NotificationsInboxShell } from "@/components/notifications/notifications-inbox-shell";

export const metadata: Metadata = {
  title: "Notifications",
};

export default async function AdminNotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; type?: string; read?: string }>;
}) {
  const { admin, institute } = await loadAdminPageContext();

  return (
    <NotificationsInboxShell
      user={admin}
      institute={institute}
      role={Role.ADMIN}
      searchParams={searchParams}
      subtitle="Institute alerts such as bank-only coverage issues."
      cardTitle="Admin inbox"
    />
  );
}
