import type { ReactNode } from "react";

import { Role } from "@/lib/generated/prisma/enums";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { StudentPageShell } from "@/components/student/student-page-shell";
import { SuperPageShell } from "@/components/super/super-page-shell";
import { TeacherPageShell } from "@/components/teacher/teacher-page-shell";
import type { InstituteBranding } from "@/server/institute-branding";

interface NotificationsPageShellProps {
  user: { id: string; name: string; role: Role; instituteId: string };
  institute: InstituteBranding | null;
  subtitle: string;
  actions?: ReactNode;
  children: ReactNode;
}

/** Role-aware AppShell wrapper for `/…/notifications` routes. */
export function NotificationsPageShell({
  user,
  institute,
  subtitle,
  actions,
  children,
}: NotificationsPageShellProps) {
  const title = "Notifications";

  switch (user.role) {
    case Role.STUDENT:
      return (
        <StudentPageShell
          user={user}
          institute={institute}
          title={title}
          subtitle={subtitle}
          actions={actions}
        >
          {children}
        </StudentPageShell>
      );
    case Role.TEACHER:
      return (
        <TeacherPageShell
          user={user}
          institute={institute}
          title={title}
          subtitle={subtitle}
          actions={actions}
        >
          {children}
        </TeacherPageShell>
      );
    case Role.ADMIN:
      return (
        <AdminPageShell
          user={user}
          institute={institute}
          title={title}
          subtitle={subtitle}
          actions={actions}
        >
          {children}
        </AdminPageShell>
      );
    case Role.SUPER_ADMIN:
      return (
        <SuperPageShell
          user={user}
          title={title}
          subtitle={subtitle}
          actions={actions}
        >
          {children}
        </SuperPageShell>
      );
    default:
      return null;
  }
}
