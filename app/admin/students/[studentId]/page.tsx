import type { Metadata } from "next";

import { requireRole } from "@/lib/session";
import { Role } from "@/lib/generated/prisma/enums";
import { loadAdminStudentPageContext } from "@/server/admin-page";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { BackLink } from "@/components/nav/back-link";
import { PermissionControlsPanel } from "@/components/permission-controls-panel";
import { StudentProgressPanel } from "@/components/student-progress-panel";
import { Badge } from "@/components/ui/badge";
import { setStudentPermissionAction } from "./actions";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ studentId: string }>;
}): Promise<Metadata> {
  const { studentId } = await params;
  const admin = await requireRole(Role.ADMIN);
  const { getAdminStudentProgress } = await import("@/server/admin");
  const progress = await getAdminStudentProgress(admin, studentId);
  return {
    title: progress ? `${progress.student.name} — Progress` : "Student progress",
  };
}

/**
 * ADMIN → read-only student progress. Same metrics as the teacher view, scoped
 * institute-wide with no move/level controls.
 */
export default async function AdminStudentProgressPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = await params;
  const { admin, institute, progress, studentPermissions } =
    await loadAdminStudentPageContext(studentId);

  const { student, group, isActive } = progress;
  const groupLabel = group?.name ?? "Unassigned";

  return (
    <AdminPageShell
      user={admin}
      institute={institute}
      title={student.name}
      subtitle={`${student.email} · ${groupLabel}`}
    >
      <BackLink href="/admin/students">All students</BackLink>

      {!isActive && (
        <div className="mt-4">
          <Badge variant="muted">Disabled</Badge>
        </div>
      )}

      <div className="mt-6">
        <StudentProgressPanel progress={progress} />
      </div>

      <PermissionControlsPanel
        title="Student permissions"
        description="Adjust access for this student without changing the role defaults."
        emptyTitle="No student permissions"
        emptyDescription="Students currently have no configurable app permissions. Practice access is still controlled by role, group, level, and active status."
        permissions={studentPermissions}
        action={setStudentPermissionAction.bind(null, student.id)}
      />
    </AdminPageShell>
  );
}
