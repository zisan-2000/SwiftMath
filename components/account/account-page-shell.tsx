import type { ReactNode } from "react";

import { Role } from "@/lib/generated/prisma/enums";
import { AppShell } from "@/components/app-shell";
import type { InstituteBranding } from "@/server/institute-branding";

interface AccountPageShellProps {
  user: { id: string; name: string; role: Role; instituteId: string };
  institute: InstituteBranding | null;
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}

/** AppShell wrapper for `/account` — Platform chrome for Super Admin. */
export function AccountPageShell({
  user,
  institute,
  title = "Account",
  subtitle = "Manage your sign-in details and notification preferences.",
  actions,
  children,
}: AccountPageShellProps) {
  const isSuper = user.role === Role.SUPER_ADMIN;

  return (
    <AppShell
      user={user}
      instituteName={isSuper ? "Platform" : (institute?.name ?? "Institute")}
      instituteLogoUrl={isSuper ? null : institute?.logoUrl}
      title={title}
      subtitle={subtitle}
      actions={actions}
    >
      {children}
    </AppShell>
  );
}
