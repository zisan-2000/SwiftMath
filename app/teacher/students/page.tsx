import type { Metadata } from "next";
import Link from "next/link";
import { Boxes } from "lucide-react";

import { listTeacherGroups, listTeacherStudents } from "@/server/teacher";
import { loadTeacherPageContext } from "@/server/teacher-page";
import { TeacherPageShell } from "@/components/teacher/teacher-page-shell";
import { TeacherStudentsTable } from "@/components/teacher/teacher-students-table";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = {
  title: "Students",
};

export default async function TeacherStudentsPage() {
  const { teacher, institute } = await loadTeacherPageContext();

  const [students, groups] = await Promise.all([
    listTeacherStudents(teacher.id),
    listTeacherGroups(teacher.id),
  ]);

  return (
    <TeacherPageShell
      user={teacher}
      institute={institute}
      title="Students"
      subtitle="Every student in your groups — open progress or jump to their group."
      actions={
        groups.length > 0 ? (
          <Button asChild>
            <Link href={`/teacher/groups/${groups[0]!.id}/students`}>
              Add student
            </Link>
          </Button>
        ) : undefined
      }
    >
      {groups.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title="Create a group first"
          description="Students belong to a group. Create one, then add students from the group’s Students tab."
          action={
            <Button asChild>
              <Link href="/teacher/groups">Go to groups</Link>
            </Button>
          }
        />
      ) : (
        <TeacherStudentsTable
          students={students.filter(
            (student): student is typeof student & {
              group: { id: string; name: string };
            } => student.group != null,
          )}
        />
      )}
    </TeacherPageShell>
  );
}
