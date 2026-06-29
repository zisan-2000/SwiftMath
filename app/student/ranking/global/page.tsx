import type { Metadata } from "next";
import { Globe, Trophy } from "lucide-react";

import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/generated/prisma/enums";
import { DEFAULT_STARTER_LEVELS } from "@/lib/default-levels";
import { parseLeaderboardPeriod } from "@/lib/ranking";
import { getGlobalLeaderboard } from "@/server/ranking";
import { AppShell } from "@/components/app-shell";
import { RankingTabs } from "@/components/student/ranking-tabs";
import { GlobalRankingFilters } from "@/components/student/global-ranking-filters";
import { RankingLeaderboardTable } from "@/components/student/ranking-leaderboard-table";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = {
  title: "Global ranking",
};

function parseLevelStep(value: string | undefined): number | undefined {
  if (!value || value === "all") return undefined;
  const step = Number.parseInt(value, 10);
  if (!Number.isFinite(step) || step < 1) return undefined;
  if (!DEFAULT_STARTER_LEVELS.some((level) => level.orderIndex === step)) {
    return undefined;
  }
  return step;
}

function buildGlobalSubtitle(
  myRank: number | undefined,
  total: number,
  filters: {
    period: "all" | "week" | "month";
    levelStepName: string | null;
  },
): string {
  const parts: string[] = [];

  if (myRank !== undefined) {
    parts.push(`You're ranked #${myRank} of ${total} globally`);
  } else {
    parts.push("Global leaderboard across all institutes");
  }

  if (filters.period === "week") parts.push("(last 7 days)");
  else if (filters.period === "month") parts.push("(last 30 days)");

  if (filters.levelStepName) {
    parts.push(`· stats for ${filters.levelStepName}`);
  }

  return parts.join(" ") + ".";
}

export default async function StudentGlobalRankingPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; step?: string }>;
}) {
  const student = await requireRole(Role.STUDENT);
  const params = await searchParams;

  const period = parseLeaderboardPeriod(params.period);
  const levelStep = parseLevelStep(params.step);
  const levelStepName =
    levelStep != null
      ? (DEFAULT_STARTER_LEVELS.find((level) => level.orderIndex === levelStep)
          ?.name ?? null)
      : null;

  const [institute, leaderboard] = await Promise.all([
    prisma.institute.findUnique({
      where: { id: student.instituteId },
      select: { name: true, logoUrl: true },
    }),
    getGlobalLeaderboard({
      period,
      ...(levelStep != null && { levelOrderIndex: levelStep }),
    }),
  ]);

  const myRank = leaderboard.find((row) => row.studentId === student.id);

  return (
    <AppShell
      user={student}
      instituteName={institute?.name ?? "Institute"}
      instituteLogoUrl={institute?.logoUrl}
      title="Global ranking"
      subtitle={buildGlobalSubtitle(myRank?.rank, leaderboard.length, {
        period,
        levelStepName,
      })}
    >
      <RankingTabs active="global" />

      <GlobalRankingFilters
        values={{
          period,
          levelStep: levelStep != null ? String(levelStep) : "all",
        }}
      />

      <p className="mb-4 text-sm text-muted-foreground">
        All active institutes · only students with a timed 100% accuracy pass,
        ranked by fastest finish
        {levelStepName ? ` at ${levelStepName}` : ""}
        {period === "week"
          ? " in the last 7 days"
          : period === "month"
            ? " in the last 30 days"
            : ""}
        .
      </p>

      {!myRank && leaderboard.length > 0 && (
        <p className="mb-4 text-sm text-muted-foreground">
          Pass a timed practice with 100% accuracy to appear on this board.
        </p>
      )}

      {leaderboard.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="No qualifying scores yet"
          description="Pass a timed practice with 100% accuracy to appear on the global leaderboard."
        />
      ) : (
        <RankingLeaderboardTable
          rows={leaderboard}
          currentStudentId={student.id}
          showInstitute
        />
      )}

      <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
        <Globe className="size-3.5 shrink-0" aria-hidden />
        Level step filter compares the same curriculum step (e.g. Addition I)
        across institutes.
      </p>
    </AppShell>
  );
}
