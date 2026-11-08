import { requirePermission } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import type { Metadata } from "next";
import { Trophy } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { ACTIVE_LEVEL_FILTER } from "@/lib/active-levels";
import { parseLeaderboardPeriod } from "@/lib/ranking";
import {
  buildTeacherRankingSubtitle,
  buildTeacherRankingViewValue,
  parseTeacherRankingView,
} from "@/lib/teacher-ranking";
import { getInstituteLeaderboard } from "@/server/ranking";
import { listTeacherGroups } from "@/server/teacher";
import { loadTeacherPageContext } from "@/server/teacher-page";
import { TeacherPageShell } from "@/components/teacher/teacher-page-shell";
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
  await requirePermission(PERMISSIONS.ANALYTICS_VIEW);
  const { teacher, institute } = await loadTeacherPageContext();
  const params = await searchParams;

  const period = parseLeaderboardPeriod(params.period);
  const levelParam = params.level && params.level !== "all" ? params.level : "all";

  const [groups, levels] = await Promise.all([
    listTeacherGroups(teacher),
    prisma.level.findMany({
      where: { instituteId: teacher.instituteId, ...ACTIVE_LEVEL_FILTER },
      orderBy: { orderIndex: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const ownedGroupIds = new Set(groups.map((group) => group.id));
  const parsedView = parseTeacherRankingView(
    params.view,
    ownedGroupIds,
  );
  const scope = parsedView.scope === "institute" ? "mine" : parsedView.scope;
  const scopedGroupId = parsedView.groupId;

  const validLevelId =
    levelParam !== "all" && levels.some((level) => level.id === levelParam)
      ? levelParam
      : undefined;

  const leaderboard = await getInstituteLeaderboard(teacher.instituteId, {
    period,
    ...(validLevelId && { levelId: validLevelId }),
    teacherId: teacher.id,
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
    <TeacherPageShell
      user={teacher}
      institute={institute}
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
        Read-only leaderboard for your assigned groups. Students need 100% on every timed attempt
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
    </TeacherPageShell>
  );
}
