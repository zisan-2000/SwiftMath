// Trusted, server-only leaderboard computation.
//
// Institute and global leaderboards are computed here from stored,
// server-written session data so the browser can't influence standings.

import "server-only";

import { prisma } from "@/lib/prisma";
import {
  leaderboardPeriodStart,
  rankLeaderboardRows,
  filterQualifiedLeaderboardRows,
  type LeaderboardPeriod,
  type RankedGlobalLeaderboardRow,
  type RankedLeaderboardRow,
} from "@/lib/ranking";
import { Role, SessionStatus, PracticeMode } from "@/lib/generated/prisma/enums";

export type { LeaderboardPeriod };

/** Filters applied when building an institute leaderboard. */
export interface LeaderboardOptions {
  /** Limit to students in this group. Omit for the whole institute. */
  groupId?: string;
  /** Only count sessions at this level toward passed/accuracy stats. */
  levelId?: string;
  /** Time window for session stats. Defaults to all-time. */
  period?: LeaderboardPeriod;
}

/** Filters applied when building a cross-institute leaderboard. */
export interface GlobalLeaderboardOptions {
  /** Time window for session stats. Defaults to all-time. */
  period?: LeaderboardPeriod;
  /** Match levels with this curriculum step (orderIndex) at any institute. */
  levelOrderIndex?: number;
}

export type RankedStudent = RankedLeaderboardRow;
export type RankedGlobalStudent = RankedGlobalLeaderboardRow;

function buildFastestPassMap(
  sessions: { studentId: string; startedAt: Date; submittedAt: Date | null }[],
): Map<string, number> {
  const fastestByStudent = new Map<string, number>();
  for (const session of sessions) {
    if (!session.submittedAt) continue;
    const durationMs = session.submittedAt.getTime() - session.startedAt.getTime();
    const current = fastestByStudent.get(session.studentId);
    if (current === undefined || durationMs < current) {
      fastestByStudent.set(session.studentId, durationMs);
    }
  }
  return fastestByStudent;
}

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

  const [students, passedGroups, accuracyGroups, perfectPasses] = await Promise.all([
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
    prisma.practiceSession.findMany({
      where: {
        ...sessionScope,
        passed: true,
        accuracy: 100,
        submittedAt: { not: null },
      },
      select: {
        studentId: true,
        startedAt: true,
        submittedAt: true,
      },
    }),
  ]);

  const passedByStudent = new Map(
    passedGroups.map((g) => [g.studentId, g._count._all]),
  );
  const accuracyByStudent = new Map(
    accuracyGroups.map((g) => [g.studentId, Math.round(g._avg.accuracy ?? 0)]),
  );
  const fastestByStudent = buildFastestPassMap(perfectPasses);

  const rows = students.map((s) => ({
    studentId: s.id,
    name: s.name,
    levelName: s.currentLevel?.name ?? null,
    levelOrder: s.currentLevel?.orderIndex ?? null,
    passedCount: passedByStudent.get(s.id) ?? 0,
    avgAccuracy: accuracyByStudent.get(s.id) ?? 0,
    fastestPassMs: fastestByStudent.get(s.id) ?? null,
  }));

  return rankLeaderboardRows(filterQualifiedLeaderboardRows(rows));
}

/**
 * Cross-institute leaderboard for all active students at active institutes.
 * Optional `levelOrderIndex` compares the same curriculum step (e.g. step 1)
 * across tenants — useful when institutes share the default starter levels.
 */
export async function getGlobalLeaderboard(
  options: GlobalLeaderboardOptions = {},
): Promise<RankedGlobalStudent[]> {
  const period = options.period ?? "all";
  const since = leaderboardPeriodStart(period);

  const activeStudentScope = {
    role: Role.STUDENT,
    isActive: true,
    institute: { isActive: true },
  };

  const sessionScope = {
    mode: PracticeMode.STANDARD,
    student: activeStudentScope,
    ...(options.levelOrderIndex != null && {
      level: { orderIndex: options.levelOrderIndex },
    }),
    ...(since && { submittedAt: { gte: since } }),
  };

  const [students, passedGroups, accuracyGroups, perfectPasses] = await Promise.all([
    prisma.user.findMany({
      where: activeStudentScope,
      select: {
        id: true,
        name: true,
        institute: { select: { name: true } },
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
    prisma.practiceSession.findMany({
      where: {
        ...sessionScope,
        passed: true,
        accuracy: 100,
        submittedAt: { not: null },
      },
      select: {
        studentId: true,
        startedAt: true,
        submittedAt: true,
      },
    }),
  ]);

  const passedByStudent = new Map(
    passedGroups.map((g) => [g.studentId, g._count._all]),
  );
  const accuracyByStudent = new Map(
    accuracyGroups.map((g) => [g.studentId, Math.round(g._avg.accuracy ?? 0)]),
  );
  const fastestByStudent = buildFastestPassMap(perfectPasses);

  const rows = students.map((s) => ({
    studentId: s.id,
    name: s.name,
    instituteName: s.institute.name,
    levelName: s.currentLevel?.name ?? null,
    levelOrder: s.currentLevel?.orderIndex ?? null,
    passedCount: passedByStudent.get(s.id) ?? 0,
    avgAccuracy: accuracyByStudent.get(s.id) ?? 0,
    fastestPassMs: fastestByStudent.get(s.id) ?? null,
  }));

  return rankLeaderboardRows(filterQualifiedLeaderboardRows(rows)) as RankedGlobalStudent[];
}
