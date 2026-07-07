import type { ReactNode } from "react";

import type { Role } from "@/lib/generated/prisma/enums";
import { AppShell } from "@/components/app-shell";
import { BackLink } from "@/components/nav/back-link";
import { AdminLevelSubNav } from "@/components/admin/admin-level-sub-nav";
import type { InstituteBranding } from "@/server/institute-branding";

interface AdminLevelShellProps {
  user: { id: string; name: string; role: Role; instituteId: string };
  institute: InstituteBranding | null;
  levelId: string;
  levelName: string;
  subtitle: string;
  actions?: ReactNode;
  children: ReactNode;
}

/** AppShell + level tab bar for `/admin/levels/[levelId]/*`. */
export function AdminLevelShell({
  user,
  institute,
  levelId,
  levelName,
  subtitle,
  actions,
  children,
}: AdminLevelShellProps) {
  return (
    <AppShell
      user={user}
      instituteName={institute?.name ?? "Institute"}
      instituteLogoUrl={institute?.logoUrl}
      title={levelName}
      subtitle={subtitle}
      actions={actions}
      subNav={<AdminLevelSubNav levelId={levelId} />}
    >
      <BackLink href="/admin/levels">All levels</BackLink>
      <div className="mt-6">{children}</div>
    </AppShell>
  );
}
