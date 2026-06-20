import type { Metadata } from "next";
import { Boxes } from "lucide-react";

import { APP_NAME } from "@/lib/constants";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/generated/prisma/enums";
import { listInstituteGroups } from "@/server/admin";
import { AppShell } from "@/components/app-shell";
import { BackLink } from "@/components/nav/back-link";
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
  title: `Groups · ${APP_NAME}`,
};

/**
 * ADMIN → groups. A read-only, institute-wide view of every group: which
 * teacher owns it and how many students it holds. Creating and managing groups
 * stays with teachers (scoped to their own).
 */
export default async function AdminGroupsPage() {
  const admin = await requireRole(Role.ADMIN);

  const [institute, groups] = await Promise.all([
    prisma.institute.findUnique({
      where: { id: admin.instituteId },
      select: { name: true },
    }),
    listInstituteGroups(admin.instituteId),
  ]);

  return (
    <AppShell
      user={admin}
      instituteName={institute?.name ?? "Institute"}
      title="Groups"
      subtitle="Every class across your institute and who teaches it."
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
                description="Teachers create and manage their own groups."
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
                      {group.name}
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
