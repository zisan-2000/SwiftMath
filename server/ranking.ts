// Trusted, server-only leaderboard computation.
//
// Ranking is always scoped to a single institute. The ordering is computed
// here from stored, server-written data (current level + graded sessions), so
// the browser can't influence standings.

import "server-only";

import { prisma } from "@/lib/prisma";
import { Role, SessionStatus } from "@/lib/generated/prisma/enums";

export interface RankedStudent {
  rank: number;
  studentId: string;
  name: string;
  levelName: string | null;
  levelOrder: number | null;
  /** Number of attempts the student has passed. */
  passedCount: number;
  /** Average accuracy across finished (non in-progress) attempts, 0–100. */
  avgAccuracy: number;
}

/**
 * Leaderboard for every student in an institute, ordered by:
 *   1. how far they've progressed (current level order, desc),
 *   2. passed attempts (desc),
 *   3. average accuracy (desc),
 *   4. name (asc) as a stable final tie-break.
 * Students with no level yet sort last.
 */
export async function getInstituteLeaderboard(
  instituteId: string,
): Promise<RankedStudent[]> {
  const [students, passedGroups, accuracyGroups] = await Promise.all([
    prisma.user.findMany({
      where: { instituteId, role: Role.STUDENT, isActive: true },
      select: {
        id: true,
        name: true,
        currentLevel: { select: { name: true, orderIndex: true } },
      },
    }),
    // Passed attempts per student.
    prisma.practiceSession.groupBy({
      by: ["studentId"],
      where: { instituteId, passed: true },
      _count: { _all: true },
    }),
    // Average accuracy over finished attempts per student.
    prisma.practiceSession.groupBy({
      by: ["studentId"],
      where: { instituteId, status: { not: SessionStatus.IN_PROGRESS } },
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

  rows.sort((a, b) => {
    const ao = a.levelOrder ?? -1;
    const bo = b.levelOrder ?? -1;
    if (bo !== ao) return bo - ao;
    if (b.passedCount !== a.passedCount) return b.passedCount - a.passedCount;
    if (b.avgAccuracy !== a.avgAccuracy) return b.avgAccuracy - a.avgAccuracy;
    return a.name.localeCompare(b.name);
  });

  return rows.map((row, index) => ({ rank: index + 1, ...row }));
}
