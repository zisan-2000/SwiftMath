import type { ReactNode } from "react";

import type { Role } from "@/lib/generated/prisma/enums";
import { AppShell } from "@/components/app-shell";
import type { InstituteBranding } from "@/server/teacher-page";

interface TeacherPageShellProps {
  user: { id: string; name: string; role: Role; instituteId: string };
  institute: InstituteBranding | null;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  dashboard?: boolean;
  children: ReactNode;
}

/** Standard AppShell wrapper for top-level teacher routes. */
export function TeacherPageShell({
  user,
  institute,
  title,
  subtitle,
  actions,
  dashboard,
  children,
}: TeacherPageShellProps) {
  return (
    <AppShell
      user={user}
      instituteName={institute?.name ?? "Institute"}
      instituteLogoUrl={institute?.logoUrl}
      title={title}
      subtitle={subtitle}
      actions={actions}
      dashboard={dashboard}
    >
      {children}
    </AppShell>
  );
}
