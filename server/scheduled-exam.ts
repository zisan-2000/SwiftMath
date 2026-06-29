// Trusted, server-only scheduled exam logic.
//
// Teachers schedule exam windows for a group + level. Students in that group
// may start exactly one timed attempt per scheduled exam while the window is
// open. Timing, eligibility, and session creation are enforced here.

import "server-only";

import { prisma } from "@/lib/prisma";
import { ACTIVE_LEVEL_FILTER } from "@/lib/active-levels";
import {
  isExamWindowOpen,
  validateScheduledExamWindow,
} from "@/lib/exam-window";
import { generateQuestion } from "@/lib/practice-logic";
import { PracticeMode, SessionStatus } from "@/lib/generated/prisma/enums";
import {
  assertStudentLevelAccess,
  checkStudentLevelAccess,
  LevelAccessError,
} from "@/server/level-access";
import { resolveStudentPracticeTimeLimit } from "@/server/teacher";

export { LevelAccessError };

/** Thrown when a scheduled exam cannot be found or is out of scope. */
export class ScheduledExamError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ScheduledExamError";
  }
}

export interface TeacherContext {
  id: string;
  instituteId: string;
}

export interface StudentContext {
  id: string;
  instituteId: string;
}

export interface CreateScheduledExamInput {
  groupId: string;
  levelId: string;
  title?: string | null;
  opensAt: Date;
  closesAt: Date;
}

/** Schedule a new exam for one of the teacher's groups. */
export async function createScheduledExam(
  teacher: TeacherContext,
  input: CreateScheduledExamInput,
): Promise<{ id: string }> {
  const windowError = validateScheduledExamWindow(input.opensAt, input.closesAt);
  if (windowError) {
    throw new ScheduledExamError(windowError);
  }

  const group = await prisma.group.findFirst({
    where: {
      id: input.groupId,
      teacherId: teacher.id,
      instituteId: teacher.instituteId,
    },
    select: { id: true },
  });
  if (!group) {
    throw new ScheduledExamError("Group not found.");
  }

  const level = await prisma.level.findFirst({
    where: {
      id: input.levelId,
      instituteId: teacher.instituteId,
      ...ACTIVE_LEVEL_FILTER,
    },
    select: { id: true },
  });
  if (!level) {
    throw new ScheduledExamError("Level not found.");
  }

  const title = input.title?.trim() || null;

  const exam = await prisma.scheduledExam.create({
    data: {
      instituteId: teacher.instituteId,
      groupId: group.id,
      levelId: level.id,
      title,
      opensAt: input.opensAt,
      closesAt: input.closesAt,
      createdById: teacher.id,
    },
    select: { id: true },
  });

  return exam;
}

/** Load a scheduled exam owned by this teacher's group. */
export function getTeacherScheduledExam(
  teacher: TeacherContext,
  scheduledExamId: string,
) {
  return prisma.scheduledExam.findFirst({
    where: {
      id: scheduledExamId,
      instituteId: teacher.instituteId,
      group: { teacherId: teacher.id },
    },
    select: {
      id: true,
      title: true,
      opensAt: true,
      closesAt: true,
      group: { select: { id: true, name: true } },
      level: { select: { id: true, name: true } },
      _count: { select: { practiceSessions: true } },
    },
  });
}

/** List exams for one of the teacher's groups, newest first. */
export function listGroupScheduledExams(
  teacher: TeacherContext,
  groupId: string,
) {
  return prisma.scheduledExam.findMany({
    where: {
      groupId,
      instituteId: teacher.instituteId,
      group: { teacherId: teacher.id },
    },
    orderBy: { opensAt: "desc" },
    select: {
      id: true,
      title: true,
      opensAt: true,
      closesAt: true,
      level: { select: { name: true } },
      _count: { select: { practiceSessions: true } },
    },
  });
}

const pendingExamSelect = {
  id: true,
  title: true,
  opensAt: true,
  closesAt: true,
  levelId: true,
  level: { select: { name: true, passAccuracy: true } },
} as const;

export type PendingScheduledExam = {
  id: string;
  title: string | null;
  opensAt: Date;
  closesAt: Date;
  levelId: string;
  level: { name: string; passAccuracy: number };
  inProgressSessionId: string | null;
};

/**
 * The student's next actionable scheduled exam, if any.
 * Prefers an in-progress attempt, then the soonest-closing open window.
 */
export async function getStudentPendingScheduledExam(
  studentId: string,
): Promise<PendingScheduledExam | null> {
  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: { groupId: true, instituteId: true },
  });
  if (!student?.groupId) return null;

  const now = new Date();

  const inProgress = await prisma.practiceSession.findFirst({
    where: {
      studentId,
      mode: PracticeMode.EXAM,
      status: SessionStatus.IN_PROGRESS,
      scheduledExam: { groupId: student.groupId },
    },
    select: {
      id: true,
      scheduledExam: { select: pendingExamSelect },
    },
  });
  if (inProgress?.scheduledExam) {
    return {
      ...inProgress.scheduledExam,
      inProgressSessionId: inProgress.id,
    };
  }

  const openExams = await prisma.scheduledExam.findMany({
    where: {
      groupId: student.groupId,
      instituteId: student.instituteId,
      opensAt: { lte: now },
      closesAt: { gte: now },
      practiceSessions: { none: { studentId } },
    },
    orderBy: { closesAt: "asc" },
    select: pendingExamSelect,
  });

  for (const exam of openExams) {
    const { allowed } = await checkStudentLevelAccess(
      studentId,
      student.instituteId,
      exam.levelId,
    );
    if (allowed) {
      return { ...exam, inProgressSessionId: null };
    }
  }

  return null;
}

/**
 * Start (or resume) the student's timed exam attempt for a scheduled slot.
 * One attempt per student per scheduled exam; window must be open on the server.
 */
export async function startExamSession(
  student: StudentContext,
  scheduledExamId: string,
): Promise<string> {
  const row = await prisma.user.findUnique({
    where: { id: student.id },
    select: { groupId: true },
  });
  if (!row?.groupId) {
    throw new ScheduledExamError("You are not in a group yet.");
  }

  const exam = await prisma.scheduledExam.findFirst({
    where: {
      id: scheduledExamId,
      instituteId: student.instituteId,
      groupId: row.groupId,
    },
    select: {
      id: true,
      levelId: true,
      opensAt: true,
      closesAt: true,
      level: {
        select: {
          questionCount: true,
          timeLimitSeconds: true,
          operation: true,
          termsPerQuestion: true,
          minNumber: true,
          maxNumber: true,
        },
      },
    },
  });
  if (!exam) {
    throw new ScheduledExamError("Exam not found.");
  }

  const now = new Date();
  if (!isExamWindowOpen(now.getTime(), exam.opensAt, exam.closesAt)) {
    throw new ScheduledExamError("This exam is not open right now.");
  }

  await assertStudentLevelAccess(
    student.id,
    student.instituteId,
    exam.levelId,
  );

  const existing = await prisma.practiceSession.findUnique({
    where: {
      studentId_scheduledExamId: {
        studentId: student.id,
        scheduledExamId: exam.id,
      },
    },
    select: { id: true, status: true },
  });

  if (existing) {
    if (existing.status === SessionStatus.IN_PROGRESS) {
      return existing.id;
    }
    throw new ScheduledExamError("You have already taken this exam.");
  }

  const otherInProgress = await prisma.practiceSession.findFirst({
    where: {
      studentId: student.id,
      status: SessionStatus.IN_PROGRESS,
    },
    select: { id: true, mode: true },
  });
  if (otherInProgress) {
    throw new ScheduledExamError(
      "Finish your current practice session before starting the exam.",
    );
  }

  const timeLimitSeconds = await resolveStudentPracticeTimeLimit(
    student.id,
    exam.levelId,
    exam.level.timeLimitSeconds,
  );

  const startedAt = now;
  const expiresAt = new Date(startedAt.getTime() + timeLimitSeconds * 1000);

  const questions = Array.from(
    { length: exam.level.questionCount },
    (_, index) => {
      const q = generateQuestion(exam.level);
      return { index, prompt: q.prompt, correctAnswer: q.correctAnswer };
    },
  );

  const session = await prisma.practiceSession.create({
    data: {
      instituteId: student.instituteId,
      studentId: student.id,
      levelId: exam.levelId,
      mode: PracticeMode.EXAM,
      scheduledExamId: exam.id,
      startedAt,
      expiresAt,
      totalQuestions: questions.length,
      questions: { create: questions },
    },
    select: { id: true },
  });

  return session.id;
}
