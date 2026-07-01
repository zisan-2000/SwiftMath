// Batch cron job for time-based exam notifications (N6).
//
// Delivers S2 (exam open), S3 (closing soon), and T2 (closed summary) without
// requiring a student or teacher to visit their dashboard.

import "server-only";

import { prisma } from "@/lib/prisma";
import {
  EXAM_CLOSING_SOON_MS,
  EXAM_CLOSED_SUMMARY_LOOKBACK_MS,
} from "@/lib/exam-window";
import { Role } from "@/lib/generated/prisma/enums";
import {
  deliverExamClosedSummaryNotification,
  deliverExamClosingSoonNotification,
  deliverExamOpenNotification,
} from "@/server/notifications";
import { loadDisabledNotificationPreferencesMap } from "@/server/notification-preferences";

export interface ScheduledExamCronStats {
  /** Open-exam alerts attempted (dedupe may skip duplicates). */
  examOpenAttempts: number;
  /** Closing-soon alerts attempted. */
  examClosingSoonAttempts: number;
  /** Closed-summary alerts attempted. */
  examClosedSummaryAttempts: number;
}

interface GroupStudent {
  id: string;
  instituteId: string;
}

/** Load active students keyed by group for batch cron delivery. */
async function loadActiveStudentsByGroup(
  groupIds: string[],
): Promise<Map<string, GroupStudent[]>> {
  const map = new Map<string, GroupStudent[]>();
  if (groupIds.length === 0) return map;

  const students = await prisma.user.findMany({
    where: {
      groupId: { in: groupIds },
      role: Role.STUDENT,
      isActive: true,
    },
    select: { id: true, instituteId: true, groupId: true },
  });

  for (const student of students) {
    if (!student.groupId) continue;
    const list = map.get(student.groupId) ?? [];
    list.push({ id: student.id, instituteId: student.instituteId });
    map.set(student.groupId, list);
  }

  return map;
}

/**
 * Run all scheduled exam notification jobs.
 * Safe to call every few minutes — dedupe keys prevent duplicate rows.
 */
export async function runScheduledExamNotificationCron(
  now = new Date(),
): Promise<ScheduledExamCronStats> {
  const stats: ScheduledExamCronStats = {
    examOpenAttempts: 0,
    examClosingSoonAttempts: 0,
    examClosedSummaryAttempts: 0,
  };

  const disabledMap = await loadDisabledNotificationPreferencesMap();
  const oneHourFromNow = new Date(now.getTime() + EXAM_CLOSING_SOON_MS);
  const lookbackStart = new Date(now.getTime() - EXAM_CLOSED_SUMMARY_LOOKBACK_MS);

  const [openExams, closedExams] = await Promise.all([
    prisma.scheduledExam.findMany({
      where: {
        opensAt: { lte: now },
        closesAt: { gte: now },
      },
      select: {
        id: true,
        instituteId: true,
        groupId: true,
        title: true,
        closesAt: true,
        level: { select: { name: true } },
      },
    }),
    prisma.scheduledExam.findMany({
      where: {
        closesAt: { lte: now, gte: lookbackStart },
      },
      select: {
        id: true,
        instituteId: true,
        groupId: true,
        title: true,
        group: { select: { name: true, teacherId: true } },
        level: { select: { name: true } },
      },
    }),
  ]);

  const groupIds = [
    ...new Set([
      ...openExams.map((exam) => exam.groupId),
      ...closedExams.map((exam) => exam.groupId),
    ]),
  ];
  const studentsByGroup = await loadActiveStudentsByGroup(groupIds);

  for (const exam of openExams) {
    const students = studentsByGroup.get(exam.groupId) ?? [];
    for (const student of students) {
      if (student.instituteId !== exam.instituteId) continue;

      await deliverExamOpenNotification(exam.instituteId, student.id, exam, disabledMap);
      stats.examOpenAttempts += 1;

      if (exam.closesAt.getTime() <= oneHourFromNow.getTime()) {
        await deliverExamClosingSoonNotification(
          exam.instituteId,
          student.id,
          exam,
          disabledMap,
        );
        stats.examClosingSoonAttempts += 1;
      }
    }
  }

  if (closedExams.length === 0) {
    return stats;
  }

  const closedExamIds = closedExams.map((exam) => exam.id);
  const closedGroupIds = [...new Set(closedExams.map((exam) => exam.groupId))];

  const [attemptRows, studentCountRows] = await Promise.all([
    prisma.practiceSession.groupBy({
      by: ["scheduledExamId"],
      where: { scheduledExamId: { in: closedExamIds } },
      _count: { _all: true },
    }),
    prisma.user.groupBy({
      by: ["groupId"],
      where: {
        groupId: { in: closedGroupIds },
        role: Role.STUDENT,
        isActive: true,
      },
      _count: { _all: true },
    }),
  ]);

  const attemptsByExam = new Map(
    attemptRows.map((row) => [row.scheduledExamId, row._count._all]),
  );
  const studentsByGroupCount = new Map(
    studentCountRows.map((row) => [row.groupId, row._count._all]),
  );

  for (const exam of closedExams) {
    await deliverExamClosedSummaryNotification(
      exam.instituteId,
      exam.group.teacherId,
      {
        examId: exam.id,
        examTitle: exam.title,
        levelName: exam.level.name,
        groupName: exam.group.name,
        groupId: exam.groupId,
        attemptedCount: attemptsByExam.get(exam.id) ?? 0,
        studentCount: studentsByGroupCount.get(exam.groupId) ?? 0,
      },
      disabledMap,
    );
    stats.examClosedSummaryAttempts += 1;
  }

  return stats;
}
