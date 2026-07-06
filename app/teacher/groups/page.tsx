import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BarChart3, Boxes, GraduationCap, ClipboardCheck } from "lucide-react";

import { listTeacherGroups } from "@/server/teacher";
import { loadTeacherPageContext } from "@/server/teacher-page";
import { TeacherPageShell } from "@/components/teacher/teacher-page-shell";
import { CreateGroupDialog } from "@/components/teacher/create-group-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Groups",
};

export default async function TeacherGroupsPage() {
  const { teacher, institute } = await loadTeacherPageContext();
  const groups = await listTeacherGroups(teacher.id);

  return (
    <TeacherPageShell
      user={teacher}
      institute={institute}
      title="Groups"
      subtitle="Your classes — open a group to manage students, exams, and settings."
      actions={<CreateGroupDialog />}
    >
      {groups.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title="No groups yet"
          description="Create your first group, then add students from the Students tab inside it."
          action={<CreateGroupDialog />}
        />
      ) : (
        <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {groups.map((group) => (
            <li key={group.id}>
              <Card className="overflow-hidden transition-colors hover:border-primary/40">
                <CardContent className="p-0">
                  <Link
                    href={`/teacher/groups/${group.id}`}
                    className="group flex items-center justify-between gap-3 border-b border-border px-5 py-4 transition-colors hover:bg-accent/30"
                  >
                    <div className="min-w-0">
                      <span className="block truncate text-lg font-semibold text-foreground group-hover:text-primary">
                        {group.name}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {group._count.students}{" "}
                        {group._count.students === 1 ? "student" : "students"}
                      </span>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                  </Link>
                  <div className="flex flex-wrap gap-2 px-5 py-3">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/teacher/groups/${group.id}/students`}>
                        <GraduationCap className="h-3.5 w-3.5" />
                        Students
                      </Link>
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/teacher/groups/${group.id}/exams`}>
                        <ClipboardCheck className="h-3.5 w-3.5" />
                        Exams
                      </Link>
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/teacher/groups/${group.id}/analytics`}>
                        <BarChart3 className="h-3.5 w-3.5" />
                        Analytics
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </TeacherPageShell>
  );
}
