import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Users } from "lucide-react";

import { APP_NAME } from "@/lib/constants";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/generated/prisma/enums";
import { getTeacherGroup, listInstituteLevels } from "@/server/teacher";
import { AppShell } from "@/components/app-shell";
import { BackLink } from "@/components/nav/back-link";
import { AddStudentDialog } from "@/components/teacher/add-student-dialog";
import { AssignLevelForm } from "@/components/teacher/assign-level-form";
import { ResetPasswordForm } from "@/components/reset-password-form";
import { DeleteGroupSection } from "@/components/teacher/delete-group-section";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { resetStudentPasswordAction } from "./actions";

export const metadata: Metadata = {
  title: `Group · ${APP_NAME}`,
};

export default async function GroupDetailPage({
  params,
}: {
  // Next.js 16: route params are async.
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const teacher = await requireRole(Role.TEACHER);

  // Scoped lookup — null if the group isn't this teacher's.
  const group = await getTeacherGroup(teacher, groupId);
  if (!group) {
    notFound();
  }

  const [institute, levels] = await Promise.all([
    prisma.institute.findUnique({
      where: { id: teacher.instituteId },
      select: { name: true },
    }),
    listInstituteLevels(teacher.instituteId),
  ]);

  return (
    <AppShell
      user={teacher}
      instituteName={institute?.name ?? "Institute"}
      title={group.name}
      subtitle="Students in this group and their assigned level."
      actions={<AddStudentDialog groupId={group.id} />}
    >
      <BackLink href="/teacher/groups">All groups</BackLink>

      {levels.length === 0 && (
        <Card className="mb-6 border-warning/30 bg-warning/10">
          <CardContent className="py-4 text-sm text-warning-foreground">
            No levels exist for your institute yet, so the level menu is empty.
            Ask your admin to create levels.
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

      <Card className="mt-8 border-destructive/20">
        <CardHeader>
          <CardTitle className="text-base text-destructive">Danger zone</CardTitle>
        </CardHeader>
        <CardContent>
          <DeleteGroupSection
            groupId={group.id}
            groupName={group.name}
            studentCount={group.students.length}
          />
        </CardContent>
      </Card>
    </AppShell>
  );
}
