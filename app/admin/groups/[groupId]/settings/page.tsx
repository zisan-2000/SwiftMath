import type { Metadata } from "next";

import { listInstituteTeacherOptions } from "@/server/admin";
import { loadAdminGroupPageContext } from "@/server/admin-page";
import { AdminGroupShell } from "@/components/admin/admin-group-shell";
import { DeleteAdminGroupSection } from "@/components/admin/delete-admin-group-section";
import { EditGroupForm } from "@/components/admin/edit-group-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Group settings",
};

export default async function AdminGroupSettingsPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const { admin, institute, group } = await loadAdminGroupPageContext(groupId);

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
    <AdminGroupShell
      user={admin}
      institute={institute}
      groupId={groupId}
      groupName={group.name}
      subtitle="Edit group details or remove an empty group."
    >
      <Card>
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
    </AdminGroupShell>
  );
}
