import type { Metadata } from "next";
import Link from "next/link";
import { Users } from "lucide-react";

import { loadAdminGroupPageContext } from "@/server/admin-page";
import { AdminGroupShell } from "@/components/admin/admin-group-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = {
  title: "Group students",
};

export default async function AdminGroupStudentsPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const { admin, institute, group } = await loadAdminGroupPageContext(groupId);

  return (
    <AdminGroupShell
      user={admin}
      institute={institute}
      groupId={groupId}
      groupName={group.name}
      subtitle="Students in this group — open progress or manage from the institute roster."
      actions={
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/students">Institute roster</Link>
        </Button>
      }
    >
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
                description="Add students from the institute roster and assign them to this group."
                action={
                  <Button asChild>
                    <Link href="/admin/students">Go to institute roster</Link>
                  </Button>
                }
              />
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {group.students.map((student) => (
                <li
                  key={student.id}
                  className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/admin/students/${student.id}`}
                      className="truncate font-medium text-foreground transition-colors hover:text-primary hover:underline"
                    >
                      {student.name}
                    </Link>
                    <p className="truncate text-sm text-muted-foreground">
                      {student.email}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {student.currentLevel ? (
                      <span className="text-sm text-muted-foreground">
                        {student.currentLevel.name}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        No level
                      </span>
                    )}
                    {!student.isActive && (
                      <Badge variant="muted">Inactive</Badge>
                    )}
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/admin/students/${student.id}`}>
                        View progress
                      </Link>
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </AdminGroupShell>
  );
}
