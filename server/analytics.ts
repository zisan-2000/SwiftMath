// Trusted, server-only analytics for role dashboards (Phase 2.5).
//
// Aggregations run here, not in the browser. Each function scopes data to the
// caller's role: institute (admin), teacher's groups, single student, or
// platform-wide (super admin).

import "server-only";

import { prisma } from "@/lib/prisma";
import {
  buildDailySessionCounts,
  computeAverageAccuracy,
  computePassRate,
  type DailySessionCount,
} from "@/lib/analytics";
import {
  buildGroupStudentSummaries,
  type GroupStudentPracticeSummary,
} from "@/lib/group-analytics";
import { SessionStatus, PracticeMode } from "@/lib/generated/prisma/enums";

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

/** Aggregate a set of finished session rows into the chart + summary shape. */
function summarizeSessions(
  sessions: { createdAt: Date; passed: boolean; accuracy: number }[],
  windowDays: number,
): InstitutePracticeAnalytics {
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

/** Start-of-day cutoff for a window that includes today. */
function windowStart(windowDays: number): Date {
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (windowDays - 1));
  return since;
}

/**
 * Practice activity for an institute over the last `days` calendar days.
 * Only counts finished attempts (excludes in-progress sessions).
 */
export async function getInstitutePracticeAnalytics(
  instituteId: string,
  days: number = DEFAULT_DAYS,
): Promise<InstitutePracticeAnalytics> {
  const windowDays = Math.max(1, days);
  const sessions = await prisma.practiceSession.findMany({
    where: {
      instituteId,
      mode: PracticeMode.STANDARD,
      status: { not: SessionStatus.IN_PROGRESS },
      createdAt: { gte: windowStart(windowDays) },
    },
    select: { createdAt: true, passed: true, accuracy: true },
    orderBy: { createdAt: "asc" },
  });

  return summarizeSessions(sessions, windowDays);
}

/**
 * Practice activity for the students in a teacher's own groups over the last
 * `days` calendar days. Scoped via the session's student → group → teacher
 * relation so a teacher only ever sees their own students' attempts.
 */
export async function getTeacherPracticeAnalytics(
  teacherId: string,
  days: number = DEFAULT_DAYS,
): Promise<InstitutePracticeAnalytics> {
  const windowDays = Math.max(1, days);
  const sessions = await prisma.practiceSession.findMany({
    where: {
      mode: PracticeMode.STANDARD,
      status: { not: SessionStatus.IN_PROGRESS },
      createdAt: { gte: windowStart(windowDays) },
      student: { group: { teacherId } },
    },
    select: { createdAt: true, passed: true, accuracy: true },
    orderBy: { createdAt: "asc" },
  });

  return summarizeSessions(sessions, windowDays);
}

/**
 * Platform-wide practice activity over the last `days` calendar days, across
 * every institute. SUPER_ADMIN only — deliberately not scoped by institute.
 */
export async function getPlatformPracticeAnalytics(
  days: number = DEFAULT_DAYS,
): Promise<InstitutePracticeAnalytics> {
  const windowDays = Math.max(1, days);
  const sessions = await prisma.practiceSession.findMany({
    where: {
      mode: PracticeMode.STANDARD,
      status: { not: SessionStatus.IN_PROGRESS },
      createdAt: { gte: windowStart(windowDays) },
    },
    select: { createdAt: true, passed: true, accuracy: true },
    orderBy: { createdAt: "asc" },
  });

  return summarizeSessions(sessions, windowDays);
}

/** Per-group practice analytics for a teacher-owned group. */
export interface GroupPracticeAnalytics extends InstitutePracticeAnalytics {
  studentCount: number;
  /** Finished standard attempts that did not pass in the window. */
  retryCount: number;
  studentSummaries: GroupStudentPracticeSummary[];
}

/**
 * Practice activity for students in one of the teacher's groups over the last
 * `days` calendar days. Returns null when the group is missing or not owned by
 * the teacher.
 */
export async function getGroupPracticeAnalytics(
  teacherId: string,
  groupId: string,
  days: number = DEFAULT_DAYS,
): Promise<GroupPracticeAnalytics | null> {
  const group = await prisma.group.findFirst({
    where: { id: groupId, teacherId },
    select: {
      id: true,
      students: {
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      },
    },
  });
  if (!group) return null;

  const windowDays = Math.max(1, days);
  const sessions = await prisma.practiceSession.findMany({
    where: {
      mode: PracticeMode.STANDARD,
      status: { not: SessionStatus.IN_PROGRESS },
      createdAt: { gte: windowStart(windowDays) },
      student: { groupId },
    },
    select: {
      createdAt: true,
      passed: true,
      accuracy: true,
      studentId: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const summary = summarizeSessions(sessions, windowDays);

  return {
    ...summary,
    studentCount: group.students.length,
    retryCount: summary.totalSessions - summary.passedSessions,
    studentSummaries: buildGroupStudentSummaries(group.students, sessions),
  };
}

/**
 * Practice activity for a single student over the last `days` calendar days.
 * Scoped by `studentId` so a student only ever sees their own attempts.
 */
export async function getStudentPracticeAnalytics(
  studentId: string,
  days: number = DEFAULT_DAYS,
): Promise<InstitutePracticeAnalytics> {
  const windowDays = Math.max(1, days);
  const sessions = await prisma.practiceSession.findMany({
    where: {
      studentId,
      mode: PracticeMode.STANDARD,
      status: { not: SessionStatus.IN_PROGRESS },
      createdAt: { gte: windowStart(windowDays) },
    },
    select: { createdAt: true, passed: true, accuracy: true },
    orderBy: { createdAt: "asc" },
  });

  return summarizeSessions(sessions, windowDays);
}
