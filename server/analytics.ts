// Trusted, server-only analytics for institute dashboards (Phase 2.5).
//
// All queries are scoped by `instituteId` — an admin only ever sees their own
// tenant's practice data. Aggregations run here, not in the browser.

import "server-only";

import { prisma } from "@/lib/prisma";
import {
  buildDailySessionCounts,
  computeAverageAccuracy,
  computePassRate,
  type DailySessionCount,
} from "@/lib/analytics";
import { SessionStatus } from "@/lib/generated/prisma/enums";

/** Summary + daily breakdown for the admin practice-activity chart. */
export interface InstitutePracticeAnalytics {
  /** Calendar days in the window (oldest → newest). */
  daily: DailySessionCount[];
  /** Finished attempts in the window. */
  totalSessions: number;
  /** Attempts that passed in the window. */
  passedSessions: number;
  /** Pass rate 0–100 for the window. */
  passRate: number;
  /** Mean accuracy 0–100 across finished attempts in the window. */
  avgAccuracy: number;
}

const DEFAULT_DAYS = 7;

/**
 * Practice activity for an institute over the last `days` calendar days.
 * Only counts finished attempts (excludes in-progress sessions).
 */
export async function getInstitutePracticeAnalytics(
  instituteId: string,
  days: number = DEFAULT_DAYS,
): Promise<InstitutePracticeAnalytics> {
  const windowDays = Math.max(1, days);
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (windowDays - 1));

  const sessions = await prisma.practiceSession.findMany({
    where: {
      instituteId,
      status: { not: SessionStatus.IN_PROGRESS },
      createdAt: { gte: since },
    },
    select: { createdAt: true, passed: true, accuracy: true },
    orderBy: { createdAt: "asc" },
  });

  const daily = buildDailySessionCounts(sessions, windowDays);
  const totalSessions = sessions.length;
  const passedSessions = sessions.filter((s) => s.passed).length;

  return {
    daily,
    totalSessions,
    passedSessions,
    passRate: computePassRate(passedSessions, totalSessions),
    avgAccuracy: computeAverageAccuracy(sessions.map((s) => s.accuracy)),
  };
}
