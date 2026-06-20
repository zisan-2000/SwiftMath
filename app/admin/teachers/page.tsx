import type { Metadata } from "next";
import { Users } from "lucide-react";

import { APP_NAME } from "@/lib/constants";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/generated/prisma/enums";
import { listInstituteTeachers } from "@/server/admin";
import { AppShell } from "@/components/app-shell";
import { BackLink } from "@/components/nav/back-link";
import { AddTeacherForm } from "@/components/admin/add-teacher-form";
import { ActiveToggle } from "@/components/admin/active-toggle";
import { ResetPasswordForm } from "@/components/reset-password-form";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { resetUserPasswordAction } from "../actions";

export const metadata: Metadata = {
  title: `Teachers · ${APP_NAME}`,
};

/**
 * ADMIN → teachers. Lists every teacher in the admin's institute and provides
 * the only Phase 1 way to provision a new teacher account (public sign-up is
 * disabled).
 */
export default async function AdminTeachersPage() {
  const admin = await requireRole(Role.ADMIN);

  const [institute, teachers] = await Promise.all([
    prisma.institute.findUnique({
      where: { id: admin.instituteId },
      select: { name: true },
    }),
    listInstituteTeachers(admin.instituteId),
  ]);

  return (
    <AppShell
      user={admin}
      instituteName={institute?.name ?? "Institute"}
      title="Teachers"
      subtitle="Create teacher accounts and see who teaches in your institute."
    >
      <BackLink href="/admin">Admin dashboard</BackLink>

      <Card className="mb-8">
        <CardHeader className="border-b border-border">
          <CardTitle className="text-base">
            All teachers ({teachers.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {teachers.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={Users}
                title="No teachers yet"
                description="Add your first teacher using the form below."
              />
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {teachers.map((teacher) => (
                <li
                  key={teacher.id}
                  className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 truncate font-medium text-foreground">
                      {teacher.name}
                      {!teacher.isActive && (
                        <Badge variant="muted">Disabled</Badge>
                      )}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">
                      {teacher.email}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-start gap-3">
                    <span className="text-sm text-muted-foreground sm:pt-1.5">
                      {teacher._count.taughtGroups}{" "}
                      {teacher._count.taughtGroups === 1 ? "group" : "groups"}
                    </span>
                    <ResetPasswordForm
                      action={resetUserPasswordAction.bind(null, teacher.id)}
                    />
                    <ActiveToggle
                      userId={teacher.id}
                      isActive={teacher.isActive}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add a teacher</CardTitle>
        </CardHeader>
        <CardContent>
          <AddTeacherForm />
        </CardContent>
      </Card>
    </AppShell>
  );
}
