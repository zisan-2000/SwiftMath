import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Boxes } from "lucide-react";

import { APP_NAME } from "@/lib/constants";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/generated/prisma/enums";
import { listTeacherGroups } from "@/server/teacher";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/ui/empty-state";
import { createGroupAction } from "./actions";

export const metadata: Metadata = {
  title: `Groups · ${APP_NAME}`,
};

export default async function TeacherGroupsPage() {
  const teacher = await requireRole(Role.TEACHER);

  const [institute, groups] = await Promise.all([
    prisma.institute.findUnique({
      where: { id: teacher.instituteId },
      select: { name: true },
    }),
    listTeacherGroups(teacher.id),
  ]);

  return (
    <AppShell
      user={teacher}
      instituteName={institute?.name ?? "Institute"}
      title="Groups"
      subtitle="Create groups and manage the students in them."
    >
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-base">Create a group</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            action={createGroupAction}
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
          >
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="name">New group name</Label>
              <Input
                id="name"
                name="name"
                required
                placeholder="e.g. Monday Beginners"
              />
            </div>
            <Button type="submit">Create group</Button>
          </form>
        </CardContent>
      </Card>

      {groups.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title="No groups yet"
          description="Create your first group above to start adding students."
        />
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {groups.map((group) => (
            <li key={group.id}>
              <Link href={`/teacher/groups/${group.id}`} className="group">
                <Card className="flex items-center justify-between gap-3 p-5 transition-colors hover:border-primary/40 hover:bg-accent/40">
                  <div className="min-w-0">
                    <span className="block truncate font-medium text-foreground">
                      {group.name}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {group._count.students}{" "}
                      {group._count.students === 1 ? "student" : "students"}
                    </span>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
