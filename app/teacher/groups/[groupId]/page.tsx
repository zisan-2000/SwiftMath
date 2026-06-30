import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BarChart3, Users } from "lucide-react";

import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/generated/prisma/enums";
import { getTeacherGroup, listGroupLevelTimeRules, listInstituteLevels } from "@/server/teacher";
import { listGroupScheduledExams } from "@/server/scheduled-exam";
import { AppShell } from "@/components/app-shell";
import { BackLink } from "@/components/nav/back-link";
import { AddStudentDialog } from "@/components/teacher/add-student-dialog";
import { AssignLevelForm } from "@/components/teacher/assign-level-form";
import { GroupLevelTimeRules } from "@/components/teacher/group-level-time-rules";
import { GroupScheduledExamsList } from "@/components/teacher/group-scheduled-exams-list";
import { ScheduleExamForm } from "@/components/teacher/schedule-exam-form";
import { ResetPasswordForm } from "@/components/reset-password-form";
import { DeleteGroupSection } from "@/components/teacher/delete-group-section";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { resetStudentPasswordAction } from "./actions";

export const metadata: Metadata = {
  title: "Group",
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

  const [institute, levels, timeRules, scheduledExams] = await Promise.all([
    prisma.institute.findUnique({
      where: { id: teacher.instituteId },
      select: { name: true, logoUrl: true },
    }),
    listInstituteLevels(teacher.instituteId),
    listGroupLevelTimeRules(teacher, groupId),
    listGroupScheduledExams(teacher, groupId),
  ]);

  return (
    <AppShell
      user={teacher}
      instituteName={institute?.name ?? "Institute"}
      instituteLogoUrl={institute?.logoUrl}
      title={group.name}
      subtitle="Students in this group and their assigned level."
      actions={<AddStudentDialog groupId={group.id} />}
    >
      <BackLink href="/teacher/groups">All groups</BackLink>

      <div className="mb-6 flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href={`/teacher/groups/${group.id}/analytics`}>
            <BarChart3 className="h-4 w-4" />
            Group analytics
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href={`/teacher/groups/${group.id}/questions`}>
            Question bank overrides
          </Link>
        </Button>
      </div>

      {levels.length === 0 && (
        <Card className="mb-6 border-warning/30 bg-warning/10">
          <CardContent className="py-4 text-sm text-warning-foreground">
            No levels exist for your institute yet, so the level menu is empty.
            Ask your admin to create levels.
          </CardContent>
        </Card>
      )}

      <Card className="mt-8">
        <CardHeader className="border-b border-border">
          <CardTitle className="text-base">Scheduled exams</CardTitle>
          <p className="text-sm text-muted-foreground">
            Students in this group see an open exam on their dashboard. Each
            student gets one timed attempt per scheduled exam.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <GroupScheduledExamsList
            exams={scheduledExams.map((exam) => ({
              id: exam.id,
              title: exam.title,
              opensAt: exam.opensAt,
              closesAt: exam.closesAt,
              level: exam.level,
              attemptCount: exam._count.practiceSessions,
            }))}
          />
        </CardContent>
        <CardContent className="border-t border-border pt-6">
          <ScheduleExamForm
            groupId={group.id}
            levels={levels.map((level) => ({
              id: level.id,
              orderIndex: level.orderIndex,
              name: level.name,
            }))}
          />
        </CardContent>
      </Card>

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

      {timeRules && timeRules.length > 0 && (
        <Card className="mt-8">
          <CardHeader className="border-b border-border">
            <CardTitle className="text-base">Level time limits</CardTitle>
            <p className="text-sm text-muted-foreground">
              Override the institute default timer for students in this group.
              Leave blank and save to use the level default.
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <GroupLevelTimeRules groupId={group.id} rules={timeRules} />
          </CardContent>
        </Card>
      )}

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
