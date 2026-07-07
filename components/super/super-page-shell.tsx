import type { ReactNode } from "react";

import type { Role } from "@/lib/generated/prisma/enums";
import { AppShell } from "@/components/app-shell";

interface SuperPageShellProps {
  user: { id: string; name: string; role: Role; instituteId: string };
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}

/** Standard AppShell wrapper for top-level super-admin routes. */
export function SuperPageShell({
  user,
  title,
  subtitle,
  actions,
  children,
}: SuperPageShellProps) {
  return (
    <AppShell
      user={user}
      instituteName="Platform"
      title={title}
      subtitle={subtitle}
      actions={actions}
    >
      {children}
    </AppShell>
  );
}
