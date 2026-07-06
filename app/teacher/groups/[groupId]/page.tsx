import type { Metadata } from "next";
import Link from "next/link";
import {
  BarChart3,
  ClipboardCheck,
  GraduationCap,
  Settings,
  Users,
} from "lucide-react";

import { getExamWindowStatus } from "@/lib/exam-window";
import { listGroupScheduledExams } from "@/server/scheduled-exam";
import { listTeacherAuditLogs } from "@/server/audit-log";
import { loadTeacherGroupPageContext } from "@/server/teacher-page";
import { TeacherGroupShell } from "@/components/teacher/teacher-group-shell";
import { GroupRecentActivityCard } from "@/components/teacher/group-recent-activity-card";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Group",
};

export default async function GroupOverviewPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const { teacher, institute, group } = await loadTeacherGroupPageContext(groupId);

  const [scheduledExams, recentActivity] = await Promise.all([
    listGroupScheduledExams(teacher, groupId),
    listTeacherAuditLogs(teacher, { groupId, limit: 10 }),
  ]);

  const nowMs = Date.now();
  const openExams = scheduledExams.filter(
    (exam) => getExamWindowStatus(nowMs, exam.opensAt, exam.closesAt) === "open",
  ).length;
  const upcomingExams = scheduledExams.filter(
    (exam) =>
      getExamWindowStatus(nowMs, exam.opensAt, exam.closesAt) === "upcoming",
  ).length;

  const shortcuts = [
    {
      href: `/teacher/groups/${groupId}/students`,
      label: "Students",
      description: "Add students, assign levels, reset passwords",
      icon: Users,
    },
    {
      href: `/teacher/groups/${groupId}/exams`,
      label: "Exams",
      description: "Schedule windows and manage attempts",
      icon: ClipboardCheck,
    },
    {
      href: `/teacher/groups/${groupId}/analytics`,
      label: "Analytics",
      description: "Pass rate, speed, and progress charts",
      icon: BarChart3,
    },
    {
      href: `/teacher/groups/${groupId}/settings`,
      label: "Settings",
      description: "Time limits, question overrides, danger zone",
      icon: Settings,
    },
  ];

  return (
    <TeacherGroupShell
      user={teacher}
      institute={institute}
      groupId={groupId}
      groupName={group.name}
      subtitle="Group overview — use the tabs to manage students, exams, and settings."
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Students"
          value={group.students.length}
          icon={GraduationCap}
        />
        <StatCard label="Open exams" value={openExams} icon={ClipboardCheck} />
        <StatCard
          label="Upcoming exams"
          value={upcomingExams}
          icon={ClipboardCheck}
        />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
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

      <div className="mt-8">
        <GroupRecentActivityCard
          groupId={group.id}
          groupName={group.name}
          items={recentActivity.items}
          total={recentActivity.total}
        />
      </div>
    </TeacherGroupShell>
  );
}
