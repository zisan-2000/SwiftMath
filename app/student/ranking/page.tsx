import type { Metadata } from "next";
import { Trophy } from "lucide-react";

import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/generated/prisma/enums";
import { parseLeaderboardPeriod } from "@/lib/ranking";
import { getInstituteLeaderboard } from "@/server/ranking";
import { AppShell } from "@/components/app-shell";
import { RankingTabs } from "@/components/student/ranking-tabs";
import { RankingFilters } from "@/components/student/ranking-filters";
import { RankingLeaderboardTable } from "@/components/student/ranking-leaderboard-table";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = {
  title: "Ranking",
};

function buildRankingSubtitle(
  myRank: number | undefined,
  total: number,
  filters: {
    scope: "all" | "group";
    groupName: string | null;
    period: "all" | "week" | "month";
    levelName: string | null;
  },
): string {
  const parts: string[] = [];

  if (myRank !== undefined) {
    parts.push(`You're ranked #${myRank} of ${total}`);
  } else {
    parts.push("Institute leaderboard");
  }

  if (filters.scope === "group" && filters.groupName) {
    parts.push(`in ${filters.groupName}`);
  }

  if (filters.period === "week") parts.push("(last 7 days)");
  else if (filters.period === "month") parts.push("(last 30 days)");

  if (filters.levelName) {
    parts.push(`· stats for ${filters.levelName}`);
  }

  return parts.join(" ") + ".";
}

export default async function StudentRankingPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; scope?: string; level?: string }>;
}) {
  const student = await requireRole(Role.STUDENT);
  const params = await searchParams;

  const period = parseLeaderboardPeriod(params.period);
  const scope = params.scope === "group" ? "group" : "all";
  const levelParam = params.level && params.level !== "all" ? params.level : "all";

  const [institute, studentRow, levels] = await Promise.all([
    prisma.institute.findUnique({
      where: { id: student.instituteId },
      select: { name: true, logoUrl: true },
    }),
    prisma.user.findUnique({
      where: { id: student.id },
      select: {
        groupId: true,
        group: { select: { name: true } },
      },
    }),
    prisma.level.findMany({
      where: { instituteId: student.instituteId },
      orderBy: { orderIndex: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const groupName = studentRow?.group?.name ?? null;
  const useGroupScope = scope === "group" && studentRow?.groupId;

  const validLevelId =
    levelParam !== "all" && levels.some((l) => l.id === levelParam)
      ? levelParam
      : undefined;

  const leaderboard = await getInstituteLeaderboard(student.instituteId, {
    period,
    ...(useGroupScope && { groupId: studentRow!.groupId! }),
    ...(validLevelId && { levelId: validLevelId }),
  });

  const myRank = leaderboard.find((row) => row.studentId === student.id);
  const selectedLevelName =
    validLevelId != null
      ? (levels.find((l) => l.id === validLevelId)?.name ?? null)
      : null;

  const filterValues = {
    period,
    scope: useGroupScope ? ("group" as const) : ("all" as const),
    levelId: validLevelId ?? "all",
  };

  return (
    <AppShell
      user={student}
      instituteName={institute?.name ?? "Institute"}
      instituteLogoUrl={institute?.logoUrl}
      title="Ranking"
      subtitle={buildRankingSubtitle(
        myRank?.rank,
        leaderboard.length,
        {
          scope: filterValues.scope,
          groupName,
          period,
          levelName: selectedLevelName,
        },
      )}
    >
      <RankingTabs active="institute" />

      <RankingFilters
        values={filterValues}
        levels={levels}
        groupName={groupName}
      />

      <p className="mb-4 text-sm text-muted-foreground">
        Only students with a timed 100% accuracy pass appear here, ranked by
        fastest finish
        {selectedLevelName ? ` at ${selectedLevelName}` : ""}
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
          description="Pass a timed practice with 100% accuracy to appear on the leaderboard."
        />
      ) : (
        <RankingLeaderboardTable
          rows={leaderboard}
          currentStudentId={student.id}
        />
      )}
    </AppShell>
  );
}
