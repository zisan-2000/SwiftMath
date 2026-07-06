import type { ReactNode } from "react";

import type { Role } from "@/lib/generated/prisma/enums";
import { AppShell } from "@/components/app-shell";
import { BackLink } from "@/components/nav/back-link";
import { TeacherGroupSubNav } from "@/components/teacher/teacher-group-sub-nav";
import type { InstituteBranding } from "@/server/teacher-page";

interface TeacherGroupShellProps {
  user: { id: string; name: string; role: Role; instituteId: string };
  institute: InstituteBranding | null;
  groupId: string;
  groupName: string;
  /** Override AppShell title (e.g. student name on progress page). */
  title?: string;
  subtitle: string;
  actions?: ReactNode;
  backHref?: string;
  backLabel?: string;
  children: ReactNode;
}

/** AppShell + group tab bar + back link for `/teacher/groups/[groupId]/*`. */
export function TeacherGroupShell({
  user,
  institute,
  groupId,
  groupName,
  title,
  subtitle,
  actions,
  backHref = "/teacher/groups",
  backLabel = "All groups",
  children,
}: TeacherGroupShellProps) {
  return (
    <AppShell
      user={user}
      instituteName={institute?.name ?? "Institute"}
      instituteLogoUrl={institute?.logoUrl}
      title={title ?? groupName}
      subtitle={subtitle}
      actions={actions}
      subNav={<TeacherGroupSubNav groupId={groupId} />}
    >
      <BackLink href={backHref}>{backLabel}</BackLink>
      <div className="mt-6">{children}</div>
    </AppShell>
  );
}
