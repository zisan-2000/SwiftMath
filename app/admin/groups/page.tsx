import type { Metadata } from "next";
import Link from "next/link";
import { Boxes } from "lucide-react";

import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/generated/prisma/enums";
import {
  listInstituteGroups,
  listInstituteTeacherOptions,
} from "@/server/admin";
import { AppShell } from "@/components/app-shell";
import { BackLink } from "@/components/nav/back-link";
import { CreateGroupDialog } from "@/components/admin/create-group-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata: Metadata = {
  title: "Groups",
};

/**
 * ADMIN → groups. Institute-wide group list with create and edit.
 */
export default async function AdminGroupsPage() {
  const admin = await requireRole(Role.ADMIN);

  const [institute, groups, teachers] = await Promise.all([
    prisma.institute.findUnique({
      where: { id: admin.instituteId },
      select: { name: true, logoUrl: true },
    }),
    listInstituteGroups(admin.instituteId),
    listInstituteTeacherOptions(admin.instituteId),
  ]);

  const teacherOptions = teachers.map((teacher) => ({
    id: teacher.id,
    name: teacher.name,
    email: teacher.email,
  }));

  return (
    <AppShell
      user={admin}
      instituteName={institute?.name ?? "Institute"}
      instituteLogoUrl={institute?.logoUrl}
      title="Groups"
      subtitle="Create groups and assign them to teachers."
      actions={<CreateGroupDialog teachers={teacherOptions} />}
    >
      <BackLink href="/admin">Admin dashboard</BackLink>

      <Card>
        <CardHeader className="border-b border-border">
          <CardTitle className="text-base">
            All groups ({groups.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {groups.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={Boxes}
                title="No groups yet"
                description={
                  teachers.length === 0
                    ? "Create a teacher first, then add a group."
                    : "Use “Create group” to add your first class."
                }
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Group</TableHead>
                  <TableHead>Teacher</TableHead>
                  <TableHead className="text-right">Students</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups.map((group) => (
                  <TableRow key={group.id}>
                    <TableCell className="font-medium text-foreground">
                      <Link
                        href={`/admin/groups/${group.id}`}
                        className="transition-colors hover:text-primary hover:underline"
                      >
                        {group.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <span className="text-foreground">
                        {group.teacher.name}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {group.teacher.email}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {group._count.students}
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
