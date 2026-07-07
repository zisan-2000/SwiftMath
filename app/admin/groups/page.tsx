import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Boxes, GraduationCap, Settings } from "lucide-react";

import { listInstituteGroups, listInstituteTeacherOptions } from "@/server/admin";
import { loadAdminPageContext } from "@/server/admin-page";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { BackLink } from "@/components/nav/back-link";
import { CreateGroupDialog } from "@/components/admin/create-group-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = {
  title: "Groups",
};

/**
 * ADMIN → groups. Institute-wide group list with create and per-group workspace.
 */
export default async function AdminGroupsPage() {
  const { admin, institute } = await loadAdminPageContext();

  const [groups, teachers] = await Promise.all([
    listInstituteGroups(admin.instituteId),
    listInstituteTeacherOptions(admin.instituteId),
  ]);

  const teacherOptions = teachers.map((teacher) => ({
    id: teacher.id,
    name: teacher.name,
    email: teacher.email,
  }));

  return (
    <AdminPageShell
      user={admin}
      institute={institute}
      title="Groups"
      subtitle="Create groups, assign teachers, and open a group to view its students."
      actions={<CreateGroupDialog teachers={teacherOptions} />}
    >
      <BackLink href="/admin">Admin dashboard</BackLink>

      {groups.length === 0 ? (
        <EmptyState
          icon={Boxes}
          className="mt-6"
          title="No groups yet"
          description={
            teachers.length === 0
              ? "Create a teacher first, then add a group."
              : "Use “Create group” to add your first class."
          }
          action={
            teachers.length > 0 ? (
              <CreateGroupDialog teachers={teacherOptions} />
            ) : undefined
          }
        />
      ) : (
        <ul className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {groups.map((group) => (
            <li key={group.id}>
              <Card className="overflow-hidden transition-colors hover:border-primary/40">
                <CardContent className="p-0">
                  <Link
                    href={`/admin/groups/${group.id}`}
                    className="group flex items-center justify-between gap-3 border-b border-border px-5 py-4 transition-colors hover:bg-accent/30"
                  >
                    <div className="min-w-0">
                      <span className="block truncate text-lg font-semibold text-foreground group-hover:text-primary">
                        {group.name}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {group.teacher.name} · {group._count.students}{" "}
                        {group._count.students === 1 ? "student" : "students"}
                      </span>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                  </Link>
                  <div className="flex flex-wrap gap-2 px-5 py-3">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/admin/groups/${group.id}/students`}>
                        <GraduationCap className="h-3.5 w-3.5" />
                        Students
                      </Link>
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/admin/groups/${group.id}/settings`}>
                        <Settings className="h-3.5 w-3.5" />
                        Settings
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </AdminPageShell>
  );
}
