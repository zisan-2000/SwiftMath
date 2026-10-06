import type { Metadata } from "next";
import { listInstituteLevels } from "@/server/teacher";
import { loadTeacherGroupPageContext } from "@/server/teacher-page";
import { TeacherGroupShell } from "@/components/teacher/teacher-group-shell";
import { AddStudentDialog } from "@/components/teacher/add-student-dialog";
import { GroupStudentsList } from "@/components/teacher/group-students-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Group students",
};

export default async function GroupStudentsPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const { teacher, institute, group } = await loadTeacherGroupPageContext(groupId);
  const levels = await listInstituteLevels(teacher.instituteId);

  return (
    <TeacherGroupShell
      user={teacher}
      institute={institute}
      groupId={groupId}
      groupName={group.name}
      subtitle="Students in this group — view Academic and Practice levels, then open progress."
      actions={<AddStudentDialog groupId={group.id} />}
    >
      {levels.length === 0 && (
        <Card className="mb-6 border-warning/30 bg-warning/10">
          <CardContent className="py-4 text-sm text-warning-foreground">
            No levels exist for your institute yet. Ask your admin to create
            levels before assigning students.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="border-b border-border">
          <CardTitle className="text-base">
            Students ({group.students.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <GroupStudentsList
            groupId={group.id}
            students={group.students}
            levels={levels}
          />
        </CardContent>
      </Card>
    </TeacherGroupShell>
  );
}
