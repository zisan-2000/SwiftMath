import type { Metadata } from "next";

import { requireSuperAdmin } from "@/lib/session";
import { Role } from "@/lib/generated/prisma/enums";
import { NotificationsInboxShell } from "@/components/notifications/notifications-inbox-shell";

export const metadata: Metadata = {
  title: "Notifications",
};

export default async function SuperAdminNotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; type?: string; read?: string }>;
}) {
  const user = await requireSuperAdmin();

  return (
    <NotificationsInboxShell
      user={user}
      role={Role.SUPER_ADMIN}
      searchParams={searchParams}
      subtitle="Platform alerts for institute provisioning and tenant status."
      cardTitle="Platform inbox"
    />
  );
}
