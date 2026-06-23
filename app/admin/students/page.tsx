import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { GraduationCap } from "lucide-react";

import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/generated/prisma/enums";
import { parsePageParam } from "@/lib/pagination";
import { listInstituteStudents } from "@/server/admin";
import { AppShell } from "@/components/app-shell";
import { BackLink } from "@/components/nav/back-link";
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
 * ADMIN → students. A read-only, institute-wide roster: who's enrolled, which
 * group they're in, and what level they're on. Adding students and assigning
 * levels stays with teachers (scoped to their own groups).
 */
export default async function AdminStudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const admin = await requireRole(Role.ADMIN);
  const { page: pageParam } = await searchParams;
  const page = parsePageParam(pageParam);

  const [institute, roster] = await Promise.all([
    prisma.institute.findUnique({
      where: { id: admin.instituteId },
      select: { name: true, logoUrl: true },
    }),
    listInstituteStudents(admin.instituteId, page),
  ]);

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
      subtitle="Everyone enrolled across your institute."
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
                description="Teachers add students within their own groups."
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
