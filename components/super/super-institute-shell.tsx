import type { ReactNode } from "react";

import type { Role } from "@/lib/generated/prisma/enums";
import { AppShell } from "@/components/app-shell";
import { BackLink } from "@/components/nav/back-link";
import { SuperInstituteSubNav } from "@/components/super/super-institute-sub-nav";

interface SuperInstituteShellProps {
  user: { id: string; name: string; role: Role; instituteId: string };
  instituteId: string;
  instituteName: string;
  subtitle: string;
  actions?: ReactNode;
  children: ReactNode;
}

/** AppShell + institute tab bar for `/super/institutes/[instituteId]/*`. */
export function SuperInstituteShell({
  user,
  instituteId,
  instituteName,
  subtitle,
  actions,
  children,
}: SuperInstituteShellProps) {
  return (
    <AppShell
      user={user}
      instituteName="Platform"
      title={instituteName}
      subtitle={subtitle}
      actions={actions}
      subNav={<SuperInstituteSubNav instituteId={instituteId} />}
    >
      <BackLink href="/super/institutes">All institutes</BackLink>
      <div className="mt-6">{children}</div>
    </AppShell>
  );
}
