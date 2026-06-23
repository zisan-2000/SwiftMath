import type { Metadata } from "next";
import { Trophy } from "lucide-react";

import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/generated/prisma/enums";
import { parseLeaderboardPeriod } from "@/lib/ranking";
import { getInstituteLeaderboard } from "@/server/ranking";
import { AppShell } from "@/components/app-shell";
import { RankingFilters } from "@/components/student/ranking-filters";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

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
      <RankingFilters
        values={filterValues}
        levels={levels}
        groupName={groupName}
      />

      {leaderboard.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="No students to rank yet"
          description="Once students start practising, the leaderboard fills up here."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>#</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead className="text-right">Passed</TableHead>
                  <TableHead className="text-right">Avg. accuracy</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaderboard.map((row) => {
                  const isMe = row.studentId === student.id;
                  return (
                    <TableRow
                      key={row.studentId}
                      className={cn(isMe && "bg-primary/5 hover:bg-primary/10")}
                    >
                      <TableCell className="font-semibold tabular-nums text-foreground">
                        {row.rank}
                      </TableCell>
                      <TableCell className="text-foreground">
                        <span className="flex items-center gap-2">
                          {row.name}
                          {isMe && <Badge>You</Badge>}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {row.levelName ?? "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-foreground">
                        {row.passedCount}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-foreground">
                        {row.avgAccuracy}%
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </AppShell>
  );
}
