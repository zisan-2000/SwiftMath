import type { Metadata } from "next";
import Link from "next/link";
import { Users } from "lucide-react";

import { listInstituteLevels } from "@/server/teacher";
import { loadTeacherGroupPageContext } from "@/server/teacher-page";
import { TeacherGroupShell } from "@/components/teacher/teacher-group-shell";
import { AddStudentDialog } from "@/components/teacher/add-student-dialog";
import { AssignLevelForm } from "@/components/teacher/assign-level-form";
import { ResetPasswordForm } from "@/components/reset-password-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { resetStudentPasswordAction } from "../actions";

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
      subtitle="Students in this group — assign levels and open progress."
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
          {group.students.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={Users}
                title="No students yet"
                description="Use the “Add student” button to create your first student."
                action={<AddStudentDialog groupId={group.id} />}
              />
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {group.students.map((student) => (
                <li
                  key={student.id}
                  className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/teacher/groups/${group.id}/students/${student.id}`}
                      className="truncate font-medium text-foreground transition-colors hover:text-primary hover:underline"
                    >
                      {student.name}
                    </Link>
                    <p className="truncate text-sm text-muted-foreground">
                      {student.email}
                    </p>
                    {student.currentLevel && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Level: {student.currentLevel.name}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col items-stretch gap-2 sm:items-end">
                    <AssignLevelForm
                      groupId={group.id}
                      studentId={student.id}
                      currentLevelId={student.currentLevelId ?? null}
                      levels={levels}
                    />
                    <ResetPasswordForm
                      action={resetStudentPasswordAction.bind(null, student.id)}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </TeacherGroupShell>
  );
}
