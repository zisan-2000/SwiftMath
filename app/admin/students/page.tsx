import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { GraduationCap } from "lucide-react";

import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/generated/prisma/enums";
import { parsePageParam } from "@/lib/pagination";
import { listInstituteGroups, listInstituteStudents, listLevels } from "@/server/admin";
import { AppShell } from "@/components/app-shell";
import { BackLink } from "@/components/nav/back-link";
import { AddStudentDialog } from "@/components/admin/add-student-dialog";
import { ActiveToggle } from "@/components/admin/active-toggle";
import { ResetPasswordForm } from "@/components/reset-password-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PaginationNav } from "@/components/ui/pagination-nav";
import { resetUserPasswordAction } from "../actions";

export const metadata: Metadata = {
  title: "Students",
};

const LIST_PATH = "/admin/students";

/**
 * ADMIN → students. Institute-wide roster plus the ability to create a student
 * and assign them to a group (optional starting level).
 */
export default async function AdminStudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const admin = await requireRole(Role.ADMIN);
  const { page: pageParam } = await searchParams;
  const page = parsePageParam(pageParam);

  const [institute, roster, groups, levels] = await Promise.all([
    prisma.institute.findUnique({
      where: { id: admin.instituteId },
      select: { name: true, logoUrl: true },
    }),
    listInstituteStudents(admin.instituteId, page),
    listInstituteGroups(admin.instituteId),
    listLevels(admin.instituteId),
  ]);

  const groupOptions = groups.map((group) => ({
    id: group.id,
    name: group.name,
    teacherName: group.teacher.name,
  }));
  const levelOptions = levels.map((level) => ({
    id: level.id,
    orderIndex: level.orderIndex,
    name: level.name,
  }));

  if (page > roster.totalPages && roster.total > 0) {
    redirect(`${LIST_PATH}?page=${roster.totalPages}`);
  }

  const { items: students } = roster;

  return (
    <AppShell
      user={admin}
      instituteName={institute?.name ?? "Institute"}
      instituteLogoUrl={institute?.logoUrl}
      title="Students"
      subtitle="Create students and see everyone enrolled across your institute."
      actions={
        <AddStudentDialog groups={groupOptions} levels={levelOptions} />
      }
    >
      <BackLink href="/admin">Admin dashboard</BackLink>

      <Card>
        <CardHeader className="border-b border-border">
          <CardTitle className="text-base">
            All students ({roster.total})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {students.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={GraduationCap}
                title="No students yet"
                description={
                  groups.length === 0
                    ? "A teacher must create a group before you can add students."
                    : "Use “Add student” to create the first student account."
                }
              />
            </div>
          ) : (
            <>
              <ul className="divide-y divide-border">
                {students.map((student) => (
                  <li
                    key={student.id}
                    className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 font-medium text-foreground">
                        {student.name}
                        {!student.isActive && (
                          <Badge variant="muted">Disabled</Badge>
                        )}
                      </p>
                      <p className="truncate text-sm text-muted-foreground">
                        {student.email}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {student.group?.name ?? "Unassigned"}
                        {" · "}
                        {student.currentLevel
                          ? `${student.currentLevel.orderIndex}. ${student.currentLevel.name}`
                          : "No level assigned"}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-start gap-2">
                      <ResetPasswordForm
                        action={resetUserPasswordAction.bind(null, student.id)}
                      />
                      <ActiveToggle
                        userId={student.id}
                        isActive={student.isActive}
                      />
                    </div>
                  </li>
                ))}
              </ul>
              <PaginationNav
                basePath={LIST_PATH}
                page={roster.page}
                pageSize={roster.pageSize}
                total={roster.total}
                totalPages={roster.totalPages}
              />
            </>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
