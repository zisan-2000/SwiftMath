import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Users } from "lucide-react";

import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/generated/prisma/enums";
import { parsePageParam } from "@/lib/pagination";
import { listInstituteTeachers } from "@/server/admin";
import { AppShell } from "@/components/app-shell";
import { BackLink } from "@/components/nav/back-link";
import { AddTeacherDialog } from "@/components/admin/add-teacher-dialog";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PaginationNav } from "@/components/ui/pagination-nav";

export const metadata: Metadata = {
  title: "Teachers",
};

const LIST_PATH = "/admin/teachers";

/**
 * ADMIN → teachers. List, create, and edit teacher accounts in the institute.
 */
export default async function AdminTeachersPage({
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
    listInstituteTeachers(admin.instituteId, page),
  ]);

  if (page > roster.totalPages && roster.total > 0) {
    redirect(`${LIST_PATH}?page=${roster.totalPages}`);
  }

  const { items: teachers } = roster;

  return (
    <AppShell
      user={admin}
      instituteName={institute?.name ?? "Institute"}
      instituteLogoUrl={institute?.logoUrl}
      title="Teachers"
      subtitle="Create and edit teacher accounts in your institute."
      actions={<AddTeacherDialog />}
    >
      <BackLink href="/admin">Admin dashboard</BackLink>

      <Card>
        <CardHeader className="border-b border-border">
          <CardTitle className="text-base">
            All teachers ({roster.total})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {teachers.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={Users}
                title="No teachers yet"
                description="Use the “Add teacher” button to create your first teacher account."
                action={<AddTeacherDialog />}
              />
            </div>
          ) : (
            <>
              <ul className="divide-y divide-border">
                {teachers.map((teacher) => (
                  <li
                    key={teacher.id}
                    className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div className="min-w-0">
                      <Link
                        href={`/admin/teachers/${teacher.id}`}
                        className="flex items-center gap-2 truncate font-medium text-foreground transition-colors hover:text-primary hover:underline"
                      >
                        {teacher.name}
                        {!teacher.isActive && (
                          <Badge variant="muted">Disabled</Badge>
                        )}
                      </Link>
                      <p className="truncate text-sm text-muted-foreground">
                        {teacher.email}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-start gap-3">
                      <span className="text-sm text-muted-foreground sm:pt-1.5">
                        {teacher._count.taughtGroups}{" "}
                        {teacher._count.taughtGroups === 1 ? "group" : "groups"}
                      </span>
                      <Link
                        href={`/admin/teachers/${teacher.id}`}
                        className="text-sm text-primary hover:underline sm:pt-1.5"
                      >
                        Edit
                      </Link>
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
