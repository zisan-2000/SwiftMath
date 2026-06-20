import type { Metadata } from "next";
import { GraduationCap } from "lucide-react";

import { APP_NAME } from "@/lib/constants";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/generated/prisma/enums";
import { listInstituteStudents } from "@/server/admin";
import { AppShell } from "@/components/app-shell";
import { BackLink } from "@/components/nav/back-link";
import { ActiveToggle } from "@/components/admin/active-toggle";
import { ResetPasswordForm } from "@/components/reset-password-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { resetUserPasswordAction } from "../actions";

export const metadata: Metadata = {
  title: `Students · ${APP_NAME}`,
};

/**
 * ADMIN → students. A read-only, institute-wide roster: who's enrolled, which
 * group they're in, and what level they're on. Adding students and assigning
 * levels stays with teachers (scoped to their own groups).
 */
export default async function AdminStudentsPage() {
  const admin = await requireRole(Role.ADMIN);

  const [institute, students] = await Promise.all([
    prisma.institute.findUnique({
      where: { id: admin.instituteId },
      select: { name: true },
    }),
    listInstituteStudents(admin.instituteId),
  ]);

  return (
    <AppShell
      user={admin}
      instituteName={institute?.name ?? "Institute"}
      title="Students"
      subtitle="Everyone enrolled across your institute."
    >
      <BackLink href="/admin">Admin dashboard</BackLink>

      <Card>
        <CardHeader className="border-b border-border">
          <CardTitle className="text-base">
            All students ({students.length})
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
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Group</TableHead>
                  <TableHead>Current level</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium text-foreground">
                      <span className="flex items-center gap-2">
                        {student.name}
                        {!student.isActive && (
                          <Badge variant="muted">Disabled</Badge>
                        )}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {student.email}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {student.group?.name ?? (
                        <span className="text-muted-foreground/60">
                          Unassigned
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {student.currentLevel ? (
                        <>
                          <span className="tabular-nums text-muted-foreground/70">
                            {student.currentLevel.orderIndex}.
                          </span>{" "}
                          {student.currentLevel.name}
                        </>
                      ) : (
                        <span className="text-muted-foreground/60">
                          Not assigned
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="flex flex-wrap items-start justify-end gap-2">
                        <ResetPasswordForm
                          action={resetUserPasswordAction.bind(
                            null,
                            student.id,
                          )}
                        />
                        <ActiveToggle
                          userId={student.id}
                          isActive={student.isActive}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
