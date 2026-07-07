import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Globe, Trophy } from "lucide-react";

import {
  getGlobalRankingLevelName,
  formatCanonicalLevelRules,
  formatGlobalRankingCompositionPolicy,
  globalRankingHref,
  parseGlobalRankingLevelStep,
} from "@/lib/global-ranking";
import { parseLeaderboardPeriod, formatStrictHundredPolicy } from "@/lib/ranking";
import { getGlobalLeaderboard } from "@/server/ranking";
import { loadStudentPageContext } from "@/server/student-page";
import { StudentPageShell } from "@/components/student/student-page-shell";
import { RankingTabs } from "@/components/student/ranking-tabs";
import { GlobalRankingFilters } from "@/components/student/global-ranking-filters";
import { GlobalRankingStepTabs } from "@/components/student/global-ranking-step-tabs";
import { RankingLeaderboardTable } from "@/components/student/ranking-leaderboard-table";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = {
  title: "Global elite ranking",
};

function buildGlobalSubtitle(
  myRank: number | undefined,
  total: number,
  filters: {
    period: "all" | "week" | "month";
    levelStepName: string;
  },
): string {
  const parts: string[] = [];

  if (myRank !== undefined) {
    parts.push(`Elite rank #${myRank} of ${total} globally`);
  } else {
    parts.push("Bonus elite board across all institutes");
  }

  parts.push(`· ${filters.levelStepName}`);

  if (filters.period === "week") parts.push("(last 7 days)");
  else if (filters.period === "month") parts.push("(last 30 days)");

  return parts.join(" ") + ".";
}

export default async function StudentGlobalRankingPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; step?: string }>;
}) {
  const { student, institute } = await loadStudentPageContext();
  const params = await searchParams;

  const period = parseLeaderboardPeriod(params.period);
  const levelStep = parseGlobalRankingLevelStep(params.step);

  // Always compare one curriculum step — redirect missing/invalid URLs.
  if (!params.step || params.step === "all" || params.step !== String(levelStep)) {
    redirect(globalRankingHref(levelStep, period));
  }

  const levelStepName = getGlobalRankingLevelName(levelStep);
  const canonicalRules = formatCanonicalLevelRules(levelStep);

  const leaderboard = await getGlobalLeaderboard({
    period,
    levelOrderIndex: levelStep,
  });

  const myRank = leaderboard.find((row) => row.studentId === student.id);

  return (
    <StudentPageShell
      user={student}
      institute={institute}
      title="Global elite ranking"
      subtitle={buildGlobalSubtitle(myRank?.rank, leaderboard.length, {
        period,
        levelStepName,
      })}
    >
      <RankingTabs active="global" />

      <GlobalRankingStepTabs activeStep={levelStep} period={period} />

      <GlobalRankingFilters
        values={{
          period,
          levelStep,
        }}
      />

      <p className="mb-4 text-sm text-muted-foreground">
        Bonus elite board — stricter than your{" "}
        <Link href="/student/ranking" className="text-primary hover:underline">
          institute ranking
        </Link>
        . Comparing {levelStepName} across all active institutes
        {canonicalRules ? ` (${canonicalRules})` : ""} · standard platform rules
        only · {formatGlobalRankingCompositionPolicy()} ·{" "}
        {formatStrictHundredPolicy(period)}, then ranked by fastest pass
        {period === "week"
          ? " in the last 7 days"
          : period === "month"
            ? " in the last 30 days"
            : ""}
        .
      </p>

      {!myRank && leaderboard.length > 0 && (
        <p className="mb-4 text-sm text-muted-foreground">
          {formatStrictHundredPolicy(period)} at {levelStepName} in this view and
          pass at least one in time to appear here.
        </p>
      )}

      {leaderboard.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="No elite scores yet"
          description={`${formatStrictHundredPolicy(period)} at ${levelStepName}, with at least one in-time pass. Only ${formatGlobalRankingCompositionPolicy()} count toward this bonus board.`}
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
        Global elite ranking uses the default curriculum rules for each step and{" "}
        {formatGlobalRankingCompositionPolicy()} so times stay fair across
        institutes. Your institute board remains the main place for daily progress.
      </p>
    </StudentPageShell>
  );
}
