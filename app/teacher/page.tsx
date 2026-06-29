import type { Metadata } from "next";
import Link from "next/link";
import { Boxes, Brain, GraduationCap, Target, Timer, TrendingUp } from "lucide-react";

import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/generated/prisma/enums";
import { formatSpeedDuration } from "@/lib/practice-speed";
import { getTeacherPracticeAnalytics, getTeacherSpeedAnalytics } from "@/server/analytics";
import { AppShell } from "@/components/app-shell";
import { StatCard } from "@/components/stat-card";
import { PracticeActivityChart } from "@/components/practice-activity-chart";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Teacher",
};

/**
 * TEACHER dashboard. Scoped to the groups this teacher owns.
 */
export default async function TeacherDashboardPage() {
  const user = await requireRole(Role.TEACHER);

  const [institute, groupCount, studentCount, practice, speed] = await Promise.all([
    prisma.institute.findUnique({
      where: { id: user.instituteId },
      select: { name: true, logoUrl: true },
    }),
    prisma.group.count({ where: { teacherId: user.id } }),
    // Students placed in any group this teacher owns.
    prisma.user.count({ where: { group: { teacherId: user.id } } }),
    getTeacherPracticeAnalytics(user.id),
    getTeacherSpeedAnalytics(user.id),
  ]);

  return (
    <AppShell
      user={user}
      instituteName={institute?.name ?? "Institute"}
      instituteLogoUrl={institute?.logoUrl}
      title="Teacher dashboard"
      subtitle="Your groups and students."
    >
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
          icon={Target}
        />
        <StatCard
          label="Avg accuracy"
          value={`${practice.avgAccuracy}%`}
          icon={TrendingUp}
        />
        <StatCard
          label="Avg pass time"
          value={formatSpeedDuration(speed.speed.avgPassMs)}
          hint="Among passed attempts"
          icon={Timer}
        />
      </div>

      <PracticeActivityChart
        data={practice.daily}
        empty={practice.totalSessions === 0}
        description="Your students' finished attempts over the last 7 days"
      />

      <div className="mt-8">
        <Button asChild>
          <Link href="/teacher/groups">Manage groups</Link>
        </Button>
      </div>
    </AppShell>
  );
}
