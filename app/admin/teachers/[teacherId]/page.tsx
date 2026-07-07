import type { Metadata } from "next";

import { requireRole } from "@/lib/session";
import { Role } from "@/lib/generated/prisma/enums";
import { loadAdminTeacherPageContext } from "@/server/admin-page";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
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
  const { getAdminTeacher } = await import("@/server/admin");
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
  const { admin, institute, teacher } =
    await loadAdminTeacherPageContext(teacherId);

  return (
    <AdminPageShell
      user={admin}
      institute={institute}
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
    </AdminPageShell>
  );
}
