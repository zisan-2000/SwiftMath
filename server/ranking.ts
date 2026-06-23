// Trusted, server-only leaderboard computation.
//
// Ranking is always scoped to a single institute. The ordering is computed
// here from stored, server-written data (current level + graded sessions), so
// the browser can't influence standings.

import "server-only";

import { prisma } from "@/lib/prisma";
import {
  leaderboardPeriodStart,
  rankLeaderboardRows,
  type LeaderboardPeriod,
  type RankedLeaderboardRow,
} from "@/lib/ranking";
import { Role, SessionStatus, PracticeMode } from "@/lib/generated/prisma/enums";

export type { LeaderboardPeriod };

/** Filters applied when building a leaderboard. */
export interface LeaderboardOptions {
  /** Limit to students in this group. Omit for the whole institute. */
  groupId?: string;
  /** Only count sessions at this level toward passed/accuracy stats. */
  levelId?: string;
  /** Time window for session stats. Defaults to all-time. */
  period?: LeaderboardPeriod;
}

export type RankedStudent = RankedLeaderboardRow;

/**
 * Leaderboard for students in an institute, optionally filtered by group,
 * level, and time period. Ordering rules live in `lib/ranking.ts`.
 */
export async function getInstituteLeaderboard(
  instituteId: string,
  options: LeaderboardOptions = {},
): Promise<RankedStudent[]> {
  const period = options.period ?? "all";
  const since = leaderboardPeriodStart(period);

  if (options.levelId) {
    const level = await prisma.level.findFirst({
      where: { id: options.levelId, instituteId },
      select: { id: true },
    });
    if (!level) {
      return [];
    }
  }

  const sessionScope = {
    instituteId,
    mode: PracticeMode.STANDARD,
    ...(options.levelId && { levelId: options.levelId }),
    ...(since && { submittedAt: { gte: since } }),
  };

  const [students, passedGroups, accuracyGroups] = await Promise.all([
    prisma.user.findMany({
      where: {
        instituteId,
        role: Role.STUDENT,
        isActive: true,
        ...(options.groupId && { groupId: options.groupId }),
      },
      select: {
        id: true,
        name: true,
        currentLevel: { select: { name: true, orderIndex: true } },
      },
    }),
    prisma.practiceSession.groupBy({
      by: ["studentId"],
      where: { ...sessionScope, passed: true },
      _count: { _all: true },
    }),
    prisma.practiceSession.groupBy({
      by: ["studentId"],
      where: { ...sessionScope, status: { not: SessionStatus.IN_PROGRESS } },
      _avg: { accuracy: true },
    }),
  ]);

  const passedByStudent = new Map(
    passedGroups.map((g) => [g.studentId, g._count._all]),
  );
  const accuracyByStudent = new Map(
    accuracyGroups.map((g) => [g.studentId, Math.round(g._avg.accuracy ?? 0)]),
  );

  const rows = students.map((s) => ({
    studentId: s.id,
    name: s.name,
    levelName: s.currentLevel?.name ?? null,
    levelOrder: s.currentLevel?.orderIndex ?? null,
    passedCount: passedByStudent.get(s.id) ?? 0,
    avgAccuracy: accuracyByStudent.get(s.id) ?? 0,
  }));

  return rankLeaderboardRows(rows);
}
