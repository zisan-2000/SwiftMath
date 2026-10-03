import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  Brain,
  GraduationCap,
  RotateCcw,
  Target,
  Timer,
  TrendingUp,
} from "lucide-react";

import { formatSpeedDuration } from "@/lib/practice-speed";
import { getGroupPracticeAnalytics } from "@/server/analytics";
import { loadTeacherGroupPageContext } from "@/server/teacher-page";
import { TeacherGroupShell } from "@/components/teacher/teacher-group-shell";
import { PracticeActivityChart } from "@/components/practice-activity-chart";
import { StatCard } from "@/components/stat-card";
import { StudentAnalyticsTable } from "@/components/teacher/student-analytics-table";
import { EmptyState } from "@/components/ui/empty-state";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ groupId: string }>;
}): Promise<Metadata> {
  const { groupId } = await params;
  const { group } = await loadTeacherGroupPageContext(groupId);
  return { title: `${group.name} analytics` };
}

export default async function GroupAnalyticsPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const { teacher, institute, group } = await loadTeacherGroupPageContext(groupId);
  const analytics = await getGroupPracticeAnalytics(teacher.id, groupId);

  if (!analytics) {
    notFound();
  }

  return (
    <TeacherGroupShell
      user={teacher}
      institute={institute}
      groupId={groupId}
      groupName={group.name}
      subtitle="Practice stats for students in this group (last 7 days)."
    >
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8">
        <StatCard
          label="Students"
          value={analytics.studentCount}
          icon={GraduationCap}
        />
        <StatCard
          label="Sessions"
          value={analytics.totalSessions}
          hint="Finished timed"
          icon={Brain}
        />
        <StatCard
          label="Student completion"
          value={`${analytics.studentCompletionRate}%`}
          hint={`${analytics.studentsPassed}/${analytics.studentCount} passed at least once`}
          icon={Target}
        />
        <StatCard
          label="Attempt completion"
          value={`${analytics.passRate}%`}
          hint="Finished attempts that passed"
          icon={Target}
        />
        <StatCard
          label="Avg accuracy"
          value={`${analytics.avgAccuracy}%`}
          icon={TrendingUp}
        />
        <StatCard
          label="Retries"
          value={analytics.retryCount}
          hint="Failed timed attempts"
          icon={RotateCcw}
        />
        <StatCard
          label="Fastest pass"
          value={formatSpeedDuration(analytics.speed.fastestPassMs)}
          hint="In this group (7 days)"
          icon={Timer}
        />
        <StatCard
          label="Avg pass time"
          value={formatSpeedDuration(analytics.speed.avgPassMs)}
          hint="Among passed attempts"
          icon={Timer}
        />
      </div>

      <PracticeActivityChart
        data={analytics.daily}
        empty={analytics.totalSessions === 0}
        description="Finished timed attempts for this group over the last 7 days"
      />

      <h2 className="mb-3 mt-10 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        By student
      </h2>
      {analytics.studentSummaries.length === 0 ? (
        <EmptyState
          title="No students in this group"
          description="Add students to see per-student analytics here."
        />
      ) : (
        <StudentAnalyticsTable
          groupId={groupId}
          rows={analytics.studentSummaries}
        />
      )}
    </TeacherGroupShell>
  );
}
