import type { ReactNode } from "react";

import type { Role } from "@/lib/generated/prisma/enums";
import { AppShell } from "@/components/app-shell";
import { BackLink } from "@/components/nav/back-link";
import { AdminGroupSubNav } from "@/components/admin/admin-group-sub-nav";
import type { InstituteBranding } from "@/server/institute-branding";

interface AdminGroupShellProps {
  user: { id: string; name: string; role: Role; instituteId: string };
  institute: InstituteBranding | null;
  groupId: string;
  groupName: string;
  subtitle: string;
  actions?: ReactNode;
  children: ReactNode;
}

/** AppShell + group tab bar for `/admin/groups/[groupId]/*`. */
export function AdminGroupShell({
  user,
  institute,
  groupId,
  groupName,
  subtitle,
  actions,
  children,
}: AdminGroupShellProps) {
  return (
    <AppShell
      user={user}
      instituteName={institute?.name ?? "Institute"}
      instituteLogoUrl={institute?.logoUrl}
      title={groupName}
      subtitle={subtitle}
      actions={actions}
      subNav={<AdminGroupSubNav groupId={groupId} />}
    >
      <BackLink href="/admin/groups">All groups</BackLink>
      <div className="mt-6">{children}</div>
    </AppShell>
  );
}
