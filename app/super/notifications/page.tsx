import type { Metadata } from "next";

import { Role } from "@/lib/generated/prisma/enums";
import { loadSuperPageContext } from "@/server/super-page";
import { NotificationsInboxShell } from "@/components/notifications/notifications-inbox-shell";

export const metadata: Metadata = {
  title: "Notifications",
};

export default async function SuperAdminNotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; type?: string; read?: string }>;
}) {
  const { user } = await loadSuperPageContext();

  return (
    <NotificationsInboxShell
      user={user}
      institute={null}
      role={Role.SUPER_ADMIN}
      searchParams={searchParams}
      subtitle="Platform alerts for institute provisioning and tenant status."
      cardTitle="Platform inbox"
    />
  );
}
