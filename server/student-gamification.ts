import "server-only";

import { prisma } from "@/lib/prisma";
import { PracticeMode, SessionStatus } from "@/lib/generated/prisma/enums";
import {
  buildStudentBadges,
  computePracticeStreak,
  countPracticeDaysInWindow,
  practiceDayKeysFromDates,
  type StudentBadge,
  type StudentGamificationStats,
} from "@/lib/student-gamification";

export type StudentGamificationSummary = StudentGamificationStats & {
  badges: StudentBadge[];
  earnedBadgeCount: number;
};

/** Streak + badges for the student dashboard, from trusted session history. */
export async function getStudentGamificationSummary(
  studentId: string,
): Promise<StudentGamificationSummary> {
  const sessions = await prisma.practiceSession.findMany({
    where: {
      studentId,
      mode: PracticeMode.STANDARD,
      status: { not: SessionStatus.IN_PROGRESS },
    },
    select: {
      createdAt: true,
      passed: true,
      accuracy: true,
      leveledUp: true,
    },
  });

  const sessionDates = sessions.map((session) => session.createdAt);
  const streakDays = computePracticeStreak(
    practiceDayKeysFromDates(sessionDates),
  );
  const sessionsLast7Days = countPracticeDaysInWindow(sessionDates, 7);

  const stats: StudentGamificationStats = {
    streakDays,
    passedCount: sessions.filter((session) => session.passed).length,
    leveledUpCount: sessions.filter((session) => session.leveledUp).length,
    hasPerfectScore: sessions.some((session) => session.accuracy === 100),
    sessionsLast7Days,
  };

  const badges = buildStudentBadges(stats);

  return {
    ...stats,
    badges,
    earnedBadgeCount: badges.filter((badge) => badge.earned).length,
  };
}
