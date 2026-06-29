// Shared student progress aggregates for teacher and admin views.
//
// Callers must verify access (teacher group ownership or admin institute scope)
// before loading progress for a student id.

import "server-only";

import { prisma } from "@/lib/prisma";
import {
  failedStandardSessionWhere,
  formatRetryCountDisplay,
} from "@/lib/student-retry-stats";
import {
  buildLevelSpeedRows,
  buildSpeedSummary,
} from "@/lib/practice-speed";
import { PracticeMode, SessionStatus } from "@/lib/generated/prisma/enums";

/** Minimal student profile needed to render progress stats. */
export type StudentProgressSubject = {
  id: string;
  name: string;
  email: string;
  currentLevel: { id: string; name: string; orderIndex: number } | null;
};

export type StudentProgressData = Awaited<
  ReturnType<typeof loadStudentProgress>
>;

/**
 * Load recent attempts and aggregate stats for a student. All metrics come from
 * server-written session rows — the browser cannot influence them.
 */
export async function loadStudentProgress(student: StudentProgressSubject) {
  const studentId = student.id;

  const [
    recentSessions,
    finishedStats,
    passedCount,
    leveledUpCount,
    totalRetries,
    currentLevelRetries,
    speedSessions,
  ] = await Promise.all([
    prisma.practiceSession.findMany({
      where: { studentId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        status: true,
        accuracy: true,
        correctCount: true,
        totalQuestions: true,
        passed: true,
        leveledUp: true,
        createdAt: true,
        startedAt: true,
        submittedAt: true,
        level: { select: { name: true } },
      },
    }),
    prisma.practiceSession.aggregate({
      where: { studentId, status: { not: SessionStatus.IN_PROGRESS } },
      _avg: { accuracy: true },
      _max: { accuracy: true },
      _count: { _all: true },
    }),
    prisma.practiceSession.count({ where: { studentId, passed: true } }),
    prisma.practiceSession.count({ where: { studentId, leveledUp: true } }),
    prisma.practiceSession.count({
      where: failedStandardSessionWhere(studentId),
    }),
    student.currentLevel
      ? prisma.practiceSession.count({
          where: failedStandardSessionWhere(
            studentId,
            student.currentLevel.id,
          ),
        })
      : Promise.resolve(null),
    prisma.practiceSession.findMany({
      where: {
        studentId,
        mode: PracticeMode.STANDARD,
        status: { not: SessionStatus.IN_PROGRESS },
        submittedAt: { not: null },
      },
      select: {
        startedAt: true,
        submittedAt: true,
        passed: true,
        levelId: true,
        level: { select: { name: true, orderIndex: true } },
      },
    }),
  ]);

  const retryCount = formatRetryCountDisplay(totalRetries, currentLevelRetries);
  const speedAll = buildSpeedSummary(speedSessions);
  const speedAtCurrentLevel = student.currentLevel
    ? buildSpeedSummary(
        speedSessions.filter(
          (session) => session.levelId === student.currentLevel!.id,
        ),
      )
    : null;
  const levelSpeedRows = buildLevelSpeedRows(
    speedSessions.map((session) => ({
      startedAt: session.startedAt,
      submittedAt: session.submittedAt,
      passed: session.passed,
      levelId: session.levelId,
      levelName: session.level.name,
      orderIndex: session.level.orderIndex,
    })),
  );

  return {
    student,
    recentSessions,
    stats: {
      completed: finishedStats._count._all,
      avgAccuracy: Math.round(finishedStats._avg.accuracy ?? 0),
      bestAccuracy: finishedStats._max.accuracy ?? 0,
      passedCount,
      leveledUpCount,
      retryCount,
      speedAll,
      speedAtCurrentLevel,
      levelSpeedRows,
    },
  };
}
