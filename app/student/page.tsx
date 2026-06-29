import type { Metadata } from "next";
import Link from "next/link";
import { Boxes, Brain, Flame, Layers, Play, Target, TrendingUp, Trophy } from "lucide-react";

import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Role, PracticeMode } from "@/lib/generated/prisma/enums";
import { getStudentPracticeAnalytics } from "@/server/analytics";
import { getStudentInProgressSession } from "@/server/practice";
import { getStudentInstituteRank } from "@/server/ranking";
import { getStudentGamificationSummary } from "@/server/student-gamification";
import { AppShell } from "@/components/app-shell";
import { StatCard } from "@/components/stat-card";
import { PracticeActivityChart } from "@/components/practice-activity-chart";
import { StudentBadgesPanel } from "@/components/student/student-badges-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Student",
};

/**
 * STUDENT dashboard. Shows current group and level with shortcuts to practice
 * and ranking.
 */
export default async function StudentDashboardPage() {
  const user = await requireRole(Role.STUDENT);

  const [profile, practice, pendingSession, instituteRank, gamification] =
    await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: {
        institute: { select: { name: true, logoUrl: true } },
        group: { select: { name: true } },
        currentLevel: { select: { name: true } },
      },
    }),
    getStudentPracticeAnalytics(user.id),
    getStudentInProgressSession(user.id),
    getStudentInstituteRank(user.id, user.instituteId),
    getStudentGamificationSummary(user.id),
  ]);

  return (
    <AppShell
      user={user}
      instituteName={profile?.institute.name ?? "Institute"}
      instituteLogoUrl={profile?.institute.logoUrl}
      title={`Hello, ${user.name}`}
      subtitle="Your practice home."
    >
      {pendingSession && (
        <Card className="mb-8 border-primary/30 bg-primary/5">
          <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium text-primary">
                Practice in progress
              </p>
              <p className="mt-1 font-semibold text-foreground">
                {pendingSession.level.name}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {pendingSession.mode === PracticeMode.REVIEW
                  ? "Review mode — no timer"
                  : pendingSession.mode === PracticeMode.CHALLENGE
                    ? "Challenge mode — harder timed drill"
                    : "Timed practice — pick up where you left off"}
              </p>
            </div>
            <Button asChild size="lg" className="shrink-0">
              <Link href={`/student/practice/${pendingSession.id}`}>
                <Play className="h-4 w-4" />
                Resume practice
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="Current level"
          value={profile?.currentLevel?.name ?? "Not assigned"}
          hint="Set by your teacher"
          icon={Layers}
        />
        <StatCard label="Group" value={profile?.group?.name ?? "—"} icon={Boxes} />
        <StatCard
          label="Practice streak"
          value={
            gamification.streakDays > 0
              ? `${gamification.streakDays} ${
                  gamification.streakDays === 1 ? "day" : "days"
                }`
              : "Start today"
          }
          hint={
            gamification.streakDays > 0
              ? "Consecutive days with timed practice"
              : "Finish a timed session to begin a streak"
          }
          icon={Flame}
        />
        <StatCard
          label="Institute rank"
          value={
            instituteRank.rank != null ? `#${instituteRank.rank}` : "Not ranked"
          }
          hint={
            instituteRank.rank != null
              ? `Of ${instituteRank.totalQualified} on the all-time leaderboard`
              : "Score 100% on every timed attempt and pass in time to rank"
          }
          icon={Trophy}
        />
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

      <StudentBadgesPanel badges={gamification.badges} />

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
