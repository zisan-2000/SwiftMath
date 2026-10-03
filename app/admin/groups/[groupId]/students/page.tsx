import type { Metadata } from "next";
import Link from "next/link";

import { loadAdminGroupPageContext } from "@/server/admin-page";
import { AdminGroupShell } from "@/components/admin/admin-group-shell";
import { AdminGroupStudentsList } from "@/components/admin/group-students-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Group students",
};

export default async function AdminGroupStudentsPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const { admin, institute, group } = await loadAdminGroupPageContext(groupId);

  return (
    <AdminGroupShell
      user={admin}
      institute={institute}
      groupId={groupId}
      groupName={group.name}
      subtitle="Students in this group — open progress or manage from the institute roster."
      actions={
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/students">Institute roster</Link>
        </Button>
      }
    >
      <Card>
        <CardHeader className="border-b border-border">
          <CardTitle className="text-base">
            Students ({group.students.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <AdminGroupStudentsList students={group.students} />
        </CardContent>
      </Card>
    </AdminGroupShell>
  );
}
