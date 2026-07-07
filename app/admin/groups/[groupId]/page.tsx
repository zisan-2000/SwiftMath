import type { Metadata } from "next";
import Link from "next/link";
import { GraduationCap, Settings, UserRound, Users } from "lucide-react";

import { loadAdminGroupPageContext } from "@/server/admin-page";
import { AdminGroupShell } from "@/components/admin/admin-group-shell";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent } from "@/components/ui/card";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ groupId: string }>;
}): Promise<Metadata> {
  const { groupId } = await params;
  const { group } = await loadAdminGroupPageContext(groupId);
  return { title: group.name };
}

export default async function AdminGroupOverviewPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const { admin, institute, group } = await loadAdminGroupPageContext(groupId);

  const activeStudents = group.students.filter((student) => student.isActive)
    .length;

  const shortcuts = [
    {
      href: `/admin/groups/${groupId}/students`,
      label: "Students",
      description: "View roster and open individual progress",
      icon: Users,
    },
    {
      href: `/admin/groups/${groupId}/settings`,
      label: "Settings",
      description: "Edit group name, reassign teacher, delete group",
      icon: Settings,
    },
    {
      href: `/admin/teachers/${group.teacherId}`,
      label: "Teacher profile",
      description: `${group.teacher.name} — view groups and activity`,
      icon: UserRound,
    },
  ];

  return (
    <AdminGroupShell
      user={admin}
      institute={institute}
      groupId={groupId}
      groupName={group.name}
      subtitle={`${group.teacher.name} · ${group._count.students} students`}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Students"
          value={group._count.students}
          icon={GraduationCap}
        />
        <StatCard
          label="Active students"
          value={activeStudents}
          hint={
            group._count.students > activeStudents
              ? `${group._count.students - activeStudents} inactive`
              : undefined
          }
          icon={Users}
        />
        <StatCard
          label="Teacher"
          value={group.teacher.name}
          hint={group.teacher.email}
          icon={UserRound}
        />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {shortcuts.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className="group">
              <Card className="h-full transition-colors hover:border-primary/40 hover:bg-accent/30">
                <CardContent className="flex items-start gap-4 p-5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-foreground group-hover:text-primary">
                      {item.label}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {group.students.length > 0 && (
        <Card className="mt-8">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-foreground">Recent students</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {group.students
                  .slice(0, 3)
                  .map((student) => student.name)
                  .join(" · ")}
                {group.students.length > 3
                  ? ` · +${group.students.length - 3} more`
                  : ""}
              </p>
            </div>
            <Link
              href={`/admin/groups/${groupId}/students`}
              className="text-sm font-medium text-primary hover:underline"
            >
              View all students
            </Link>
          </CardContent>
        </Card>
      )}
    </AdminGroupShell>
  );
}
