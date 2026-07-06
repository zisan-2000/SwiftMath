import type { Metadata } from "next";
import Link from "next/link";
import {
  Boxes,
  Brain,
  ClipboardCheck,
  GraduationCap,
  Target,
  Timer,
  TrendingUp,
  Trophy,
} from "lucide-react";

import { prisma } from "@/lib/prisma";
import { formatSpeedDuration } from "@/lib/practice-speed";
import { getTeacherDashboardAnalytics } from "@/server/analytics";
import { syncTeacherExamClosedNotifications } from "@/server/notifications";
import { loadTeacherPageContext } from "@/server/teacher-page";
import { TeacherPageShell } from "@/components/teacher/teacher-page-shell";
import { StatCard } from "@/components/stat-card";
import { PracticeActivityChart } from "@/components/practice-activity-chart";
import { GroupCompletionTable } from "@/components/teacher/group-completion-table";
import { TeacherGroupComparisonChart } from "@/components/teacher/teacher-group-comparison-chart";
import { TeacherProgressChart } from "@/components/teacher/teacher-progress-chart";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Teacher",
};

/**
 * TEACHER dashboard. Scoped to the groups this teacher owns.
 */
export default async function TeacherDashboardPage() {
  const { teacher, institute } = await loadTeacherPageContext();

  await syncTeacherExamClosedNotifications(teacher.id, teacher.instituteId);

  const [groupCount, studentCount, dashboard] = await Promise.all([
    prisma.group.count({ where: { teacherId: teacher.id } }),
    prisma.user.count({ where: { group: { teacherId: teacher.id } } }),
    getTeacherDashboardAnalytics(teacher.id),
  ]);

  const { practice, speed, dailyProgress, groupComparison, groupCompletion } =
    dashboard;

  return (
    <TeacherPageShell
      user={teacher}
      institute={institute}
      title="Teacher dashboard"
      subtitle="Your groups and students at a glance."
    >
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Button asChild variant="outline" className="h-auto flex-col gap-1 py-4">
          <Link href="/teacher/students">
            <GraduationCap className="h-5 w-5" />
            <span>Students</span>
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-auto flex-col gap-1 py-4">
          <Link href="/teacher/exams">
            <ClipboardCheck className="h-5 w-5" />
            <span>Exams</span>
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-auto flex-col gap-1 py-4">
          <Link href="/teacher/groups">
            <Boxes className="h-5 w-5" />
            <span>Groups</span>
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-auto flex-col gap-1 py-4">
          <Link href="/teacher/ranking">
            <Trophy className="h-5 w-5" />
            <span>Ranking</span>
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <StatCard label="My groups" value={groupCount} icon={Boxes} />
        <StatCard label="My students" value={studentCount} icon={GraduationCap} />
      </div>

      <h2 className="mb-3 mt-10 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Practice (last 7 days)
      </h2>
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Sessions" value={practice.totalSessions} icon={Brain} />
        <StatCard
          label="Pass rate"
          value={`${practice.passRate}%`}
          hint="Attempt completion"
          icon={Target}
        />
        <StatCard
          label="Avg accuracy"
          value={`${practice.avgAccuracy}%`}
          icon={TrendingUp}
        />
        <StatCard
          label="Avg pass time"
          value={formatSpeedDuration(speed.avgPassMs)}
          hint="Among passed attempts"
          icon={Timer}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <PracticeActivityChart
          data={practice.daily}
          empty={practice.totalSessions === 0}
          description="Finished attempts over the last 7 days"
        />
        <TeacherProgressChart
          data={dailyProgress}
          empty={practice.totalSessions === 0}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6">
        <TeacherGroupComparisonChart
          data={groupComparison}
          empty={groupCount === 0}
        />
      </div>

      <h2 className="mb-3 mt-10 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Completion by group
      </h2>
      <GroupCompletionTable rows={groupCompletion} />
    </TeacherPageShell>
  );
}
