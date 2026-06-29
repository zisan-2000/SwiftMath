import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/generated/prisma/enums";
import { getAdminGroup, listInstituteTeacherOptions } from "@/server/admin";
import { AppShell } from "@/components/app-shell";
import { BackLink } from "@/components/nav/back-link";
import { DeleteAdminGroupSection } from "@/components/admin/delete-admin-group-section";
import { EditGroupForm } from "@/components/admin/edit-group-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ groupId: string }>;
}): Promise<Metadata> {
  const { groupId } = await params;
  const admin = await requireRole(Role.ADMIN);
  const group = await getAdminGroup(admin, groupId);
  return {
    title: group ? `Edit ${group.name}` : "Edit group",
  };
}

export default async function AdminEditGroupPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const admin = await requireRole(Role.ADMIN);

  const [institute, group] = await Promise.all([
    prisma.institute.findUnique({
      where: { id: admin.instituteId },
      select: { name: true, logoUrl: true },
    }),
    getAdminGroup(admin, groupId),
  ]);

  if (!group) {
    notFound();
  }

  const teachers = await listInstituteTeacherOptions(
    admin.instituteId,
    group.teacherId,
  );

  const teacherOptions = teachers.map((teacher) => ({
    id: teacher.id,
    name: teacher.name,
    email: teacher.email,
  }));

  return (
    <AppShell
      user={admin}
      instituteName={institute?.name ?? "Institute"}
      instituteLogoUrl={institute?.logoUrl}
      title={group.name}
      subtitle={`${group._count.students} students · ${group.teacher.name}`}
    >
      <BackLink href="/admin/groups">All groups</BackLink>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Group details</CardTitle>
        </CardHeader>
        <CardContent>
          <EditGroupForm
            groupId={group.id}
            defaultName={group.name}
            defaultTeacherId={group.teacherId}
            teachers={teacherOptions}
          />
        </CardContent>
      </Card>

      <Card className="mt-8 border-destructive/20">
        <CardHeader>
          <CardTitle className="text-base text-destructive">Danger zone</CardTitle>
        </CardHeader>
        <CardContent>
          <DeleteAdminGroupSection
            groupId={group.id}
            groupName={group.name}
            studentCount={group._count.students}
          />
        </CardContent>
      </Card>
    </AppShell>
  );
}
