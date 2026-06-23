import type { Metadata } from "next";
import Link from "next/link";
import { Boxes, Brain, Layers, Target, TrendingUp } from "lucide-react";

import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/generated/prisma/enums";
import { getStudentPracticeAnalytics } from "@/server/analytics";
import { AppShell } from "@/components/app-shell";
import { StatCard } from "@/components/stat-card";
import { PracticeActivityChart } from "@/components/practice-activity-chart";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Student",
};

/**
 * STUDENT dashboard. Shows current group and level with shortcuts to practice
 * and ranking.
 */
export default async function StudentDashboardPage() {
  const user = await requireRole(Role.STUDENT);

  const [profile, practice] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: {
        institute: { select: { name: true, logoUrl: true } },
        group: { select: { name: true } },
        currentLevel: { select: { name: true } },
      },
    }),
    getStudentPracticeAnalytics(user.id),
  ]);

  return (
    <AppShell
      user={user}
      instituteName={profile?.institute.name ?? "Institute"}
      instituteLogoUrl={profile?.institute.logoUrl}
      title={`Hello, ${user.name}`}
      subtitle="Your practice home."
    >
      <div className="grid grid-cols-2 gap-4">
        <StatCard
          label="Current level"
          value={profile?.currentLevel?.name ?? "Not assigned"}
          hint="Set by your teacher"
          icon={Layers}
        />
        <StatCard label="Group" value={profile?.group?.name ?? "—"} icon={Boxes} />
      </div>

      <h2 className="mb-3 mt-10 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Your progress (last 7 days)
      </h2>
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
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
      </div>

      <PracticeActivityChart
        data={practice.daily}
        empty={practice.totalSessions === 0}
        description="Your finished attempts over the last 7 days"
      />

      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/student/practice">Go to practice</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/student/ranking">View ranking</Link>
        </Button>
      </div>
    </AppShell>
  );
}
