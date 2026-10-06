"use client";

import Link from "next/link";
import { Users } from "lucide-react";

import { resetStudentPasswordAction } from "@/app/teacher/groups/[groupId]/actions";
import { AddStudentDialog } from "@/components/teacher/add-student-dialog";
import { AssignLevelForm } from "@/components/teacher/assign-level-form";
import { ResetPasswordForm } from "@/components/reset-password-form";
import { EmptyState } from "@/components/ui/empty-state";
import {
  StudentSearch,
  useStudentSearch,
} from "@/components/ui/student-search";

interface GroupStudent {
  id: string;
  name: string;
  email: string;
  currentLevelId: string | null;
  currentLevel: { name: string } | null;
  academicLevel: { name: string } | null;
}

interface LevelOption {
  id: string;
  orderIndex: number;
  name: string;
}

export function GroupStudentsList({
  groupId,
  students,
  levels,
}: {
  groupId: string;
  students: GroupStudent[];
  levels: LevelOption[];
}) {
  const { query, setQuery, filteredStudents } = useStudentSearch(students);

  if (students.length === 0) {
    return (
      <div className="p-6">
        <EmptyState
          icon={Users}
          title="No students yet"
          description="Use the “Add student” button to create your first student."
          action={<AddStudentDialog groupId={groupId} />}
        />
      </div>
    );
  }

  return (
    <>
      <div className="border-b border-border p-4">
        <StudentSearch
          id="teacher-group-students-search"
          query={query}
          onQueryChange={setQuery}
          resultCount={filteredStudents.length}
          totalCount={students.length}
        />
      </div>
      {filteredStudents.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-muted-foreground">
          No students match “{query.trim()}”.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {filteredStudents.map((student) => (
            <li
              key={student.id}
              className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="min-w-0">
                <Link
                  href={`/teacher/groups/${groupId}/students/${student.id}`}
                  className="truncate font-medium text-foreground transition-colors hover:text-primary hover:underline"
                >
                  {student.name}
                </Link>
                <p className="truncate text-sm text-muted-foreground">
                  {student.email}
                </p>
                {student.currentLevel ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Practice level: {student.currentLevel.name}
                  </p>
                ) : null}
                <p className="mt-1 text-xs text-muted-foreground">
                  Academic Level: {student.academicLevel?.name ?? "Unassigned"}
                </p>
              </div>

              <div className="flex flex-col items-stretch gap-2 sm:items-end">
                <AssignLevelForm
                  groupId={groupId}
                  studentId={student.id}
                  currentLevelId={student.currentLevelId}
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
    </>
  );
}
