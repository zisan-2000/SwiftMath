import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/generated/prisma/enums";
import { getAdminStudentProgress } from "@/server/admin";
import { AppShell } from "@/components/app-shell";
import { BackLink } from "@/components/nav/back-link";
import { StudentProgressPanel } from "@/components/student-progress-panel";
import { Badge } from "@/components/ui/badge";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ studentId: string }>;
}): Promise<Metadata> {
  const { studentId } = await params;
  const admin = await requireRole(Role.ADMIN);
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
  const admin = await requireRole(Role.ADMIN);

  const [institute, progress] = await Promise.all([
    prisma.institute.findUnique({
      where: { id: admin.instituteId },
      select: { name: true, logoUrl: true },
    }),
    getAdminStudentProgress(admin, studentId),
  ]);

  if (!progress) {
    notFound();
  }

  const { student, group, isActive } = progress;
  const groupLabel = group?.name ?? "Unassigned";

  return (
    <AppShell
      user={admin}
      instituteName={institute?.name ?? "Institute"}
      instituteLogoUrl={institute?.logoUrl}
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
    </AppShell>
  );
}
