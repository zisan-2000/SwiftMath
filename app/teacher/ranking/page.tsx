import type { Metadata } from "next";
import { Trophy } from "lucide-react";

import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ACTIVE_LEVEL_FILTER } from "@/lib/active-levels";
import { Role } from "@/lib/generated/prisma/enums";
import { parseLeaderboardPeriod } from "@/lib/ranking";
import {
  buildTeacherRankingSubtitle,
  buildTeacherRankingViewValue,
  parseTeacherRankingView,
} from "@/lib/teacher-ranking";
import { getInstituteLeaderboard } from "@/server/ranking";
import { listTeacherGroups } from "@/server/teacher";
import { AppShell } from "@/components/app-shell";
import { TeacherRankingFilters } from "@/components/teacher/teacher-ranking-filters";
import { RankingLeaderboardTable } from "@/components/student/ranking-leaderboard-table";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = {
  title: "Ranking",
};

export default async function TeacherRankingPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; view?: string; level?: string }>;
}) {
  const teacher = await requireRole(Role.TEACHER);
  const params = await searchParams;

  const period = parseLeaderboardPeriod(params.period);
  const levelParam = params.level && params.level !== "all" ? params.level : "all";

  const [institute, groups, levels] = await Promise.all([
    prisma.institute.findUnique({
      where: { id: teacher.instituteId },
      select: { name: true, logoUrl: true },
    }),
    listTeacherGroups(teacher.id),
    prisma.level.findMany({
      where: { instituteId: teacher.instituteId, ...ACTIVE_LEVEL_FILTER },
      orderBy: { orderIndex: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const ownedGroupIds = new Set(groups.map((group) => group.id));
  const { scope, groupId: scopedGroupId } = parseTeacherRankingView(
    params.view,
    ownedGroupIds,
  );

  const validLevelId =
    levelParam !== "all" && levels.some((level) => level.id === levelParam)
      ? levelParam
      : undefined;

  const leaderboard = await getInstituteLeaderboard(teacher.instituteId, {
    period,
    ...(validLevelId && { levelId: validLevelId }),
    ...(scope === "mine" && { teacherId: teacher.id }),
    ...(scope === "group" && scopedGroupId && { groupId: scopedGroupId }),
  });

  const selectedGroupName =
    scope === "group" && scopedGroupId
      ? (groups.find((group) => group.id === scopedGroupId)?.name ?? null)
      : null;
  const selectedLevelName =
    validLevelId != null
      ? (levels.find((level) => level.id === validLevelId)?.name ?? null)
      : null;

  const filterValues = {
    period,
    view: buildTeacherRankingViewValue(scope, scopedGroupId),
    levelId: validLevelId ?? "all",
  };

  return (
    <AppShell
      user={teacher}
      instituteName={institute?.name ?? "Institute"}
      instituteLogoUrl={institute?.logoUrl}
      title="Ranking"
      subtitle={buildTeacherRankingSubtitle(leaderboard.length, {
        scope,
        groupName: selectedGroupName,
        period,
        levelName: selectedLevelName,
      })}
    >
      <TeacherRankingFilters
        values={filterValues}
        levels={levels}
        groups={groups.map((group) => ({ id: group.id, name: group.name }))}
      />

      <p className="mb-4 text-sm text-muted-foreground">
        Read-only institute leaderboard. Students need 100% on every timed attempt
        in this view, then rank by fastest pass
        {selectedLevelName ? ` at ${selectedLevelName}` : ""}
        {period === "week"
          ? " in the last 7 days"
          : period === "month"
            ? " in the last 30 days"
            : ""}
        . Click a student to open their progress page.
      </p>

      {leaderboard.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="No qualifying scores yet"
          description="No students meet the 100% accuracy rule for this view yet."
        />
      ) : (
        <RankingLeaderboardTable
          rows={leaderboard}
          getStudentHref={(row) =>
            row.groupId
              ? `/teacher/groups/${row.groupId}/students/${row.studentId}`
              : null
          }
        />
      )}
    </AppShell>
  );
}
