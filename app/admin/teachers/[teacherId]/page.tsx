import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/generated/prisma/enums";
import { getAdminTeacher } from "@/server/admin";
import { AppShell } from "@/components/app-shell";
import { BackLink } from "@/components/nav/back-link";
import { ActiveToggle } from "@/components/admin/active-toggle";
import { EditTeacherForm } from "@/components/admin/edit-teacher-form";
import { ResetPasswordForm } from "@/components/reset-password-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { resetUserPasswordAction } from "../../actions";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ teacherId: string }>;
}): Promise<Metadata> {
  const { teacherId } = await params;
  const admin = await requireRole(Role.ADMIN);
  const teacher = await getAdminTeacher(admin, teacherId);
  return {
    title: teacher ? `Edit ${teacher.name}` : "Edit teacher",
  };
}

export default async function AdminEditTeacherPage({
  params,
}: {
  params: Promise<{ teacherId: string }>;
}) {
  const { teacherId } = await params;
  const admin = await requireRole(Role.ADMIN);

  const [institute, teacher] = await Promise.all([
    prisma.institute.findUnique({
      where: { id: admin.instituteId },
      select: { name: true, logoUrl: true },
    }),
    getAdminTeacher(admin, teacherId),
  ]);

  if (!teacher) {
    notFound();
  }

  return (
    <AppShell
      user={admin}
      instituteName={institute?.name ?? "Institute"}
      instituteLogoUrl={institute?.logoUrl}
      title={teacher.name}
      subtitle={`${teacher._count.taughtGroups} ${
        teacher._count.taughtGroups === 1 ? "group" : "groups"
      }`}
    >
      <BackLink href="/admin/teachers">All teachers</BackLink>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2 text-base">
            Profile
            {!teacher.isActive && <Badge variant="muted">Disabled</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EditTeacherForm
            teacherId={teacher.id}
            defaultName={teacher.name}
            defaultEmail={teacher.email}
          />
        </CardContent>
      </Card>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-base">Account access</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start">
          <ResetPasswordForm
            action={resetUserPasswordAction.bind(null, teacher.id)}
          />
          <ActiveToggle userId={teacher.id} isActive={teacher.isActive} />
        </CardContent>
      </Card>
    </AppShell>
  );
}
