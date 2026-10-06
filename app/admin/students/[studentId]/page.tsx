import type { Metadata } from "next";

import { requireRole } from "@/lib/session";
import { Role } from "@/lib/generated/prisma/enums";
import { loadAdminStudentPageContext } from "@/server/admin-page";
import { getStudentClassPerformanceForAdmin } from "@/server/class-performance";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { BackLink } from "@/components/nav/back-link";
import { PermissionControlsPanel } from "@/components/permission-controls-panel";
import { StudentProgressPanel } from "@/components/student-progress-panel";
import { ClassPerformanceHistory } from "@/components/class-performance-history";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { getAdminStudentAcademicLevel, listAcademicLevels } from "@/server/academic-levels";
import { assignAdminAcademicLevelAction, setStudentPermissionAction } from "./actions";

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
  const [classPerformance, academicLevels, academicAssignment] = await Promise.all([
    getStudentClassPerformanceForAdmin(admin, studentId),
    listAcademicLevels(admin.instituteId),
    getAdminStudentAcademicLevel({ id: admin.id, instituteId: admin.instituteId, role: admin.role }, studentId),
  ]);

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

      <Card className="mt-8">
        <CardHeader><CardTitle className="text-base">Academic Level</CardTitle><p className="text-sm text-muted-foreground">Main teacher-controlled level; independent from Practice/Exam progression.</p></CardHeader>
        <CardContent>
          <form action={assignAdminAcademicLevelAction.bind(null, student.id)} className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2"><Label htmlFor="academicLevelId">Academic Level</Label><select id="academicLevelId" name="academicLevelId" defaultValue={academicAssignment?.academicLevelId ?? ""} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">— Unassigned —</option>{academicLevels.map((level) => <option key={level.id} value={level.id}>{level.orderIndex}. {level.name}</option>)}</select></div>
            <Button type="submit" variant="outline">Save Academic Level</Button>
          </form>
        </CardContent>
      </Card>

      {classPerformance ? (
        <ClassPerformanceHistory history={classPerformance} />
      ) : null}

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
