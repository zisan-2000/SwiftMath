// Trusted, server-only practice engine.
//
// The browser is treated as hostile. The server:
//   - generates questions and stores their correct answers (never sent to the
//     client while a session is in progress),
//   - stamps startedAt / expiresAt from the server clock,
//   - grades answers, computes accuracy + pass, and decides level-up,
// all inside transactions. Nothing about timing or scoring is trusted from the
// request body except the raw answers themselves.

import "server-only";

import { prisma } from "@/lib/prisma";
import { ACTIVE_LEVEL_FILTER } from "@/lib/active-levels";
import { PracticeMode, SessionStatus } from "@/lib/generated/prisma/enums";
import { assertStudentLevelAccess } from "@/server/level-access";
import { resolveStudentPracticeTimeLimit } from "@/server/teacher";
import {
  collectAnomalyFlags,
  sanitizeTabBlurCount,
} from "@/lib/practice-anomaly";
import {
  computeAccuracy,
  didPass,
  gradeAnswers,
  isExpired,
} from "@/lib/practice-logic";
import {
  resolveChallengePassAccuracy,
  resolveChallengeTimeLimitSeconds,
} from "@/lib/challenge-mode";
import { buildSessionQuestionsForStudent } from "@/server/question-bank";
import { getActiveCurriculumVersionId } from "@/server/curriculum-version";
import { notifyStudentLevelUp, notifyTeacherGroupBankBlocked } from "@/server/notifications";
import { InsufficientBankError } from "@/lib/question-bank";

/** The authenticated student, as needed for scoping. */
export interface StudentContext {
  id: string;
  instituteId: string;
}

export interface PracticeSubmitTelemetry {
  /** Untrusted hint from the browser — logged only, never affects grading. */
  tabBlurCount?: number;
}

/** Structured log line when anomaly flags are recorded (ops / future audit). */
function logPracticeAnomalies(
  sessionId: string,
  studentId: string,
  flags: string[],
) {
  if (flags.length === 0) return;
  console.warn(
    JSON.stringify({
      event: "practice.anomaly",
      sessionId,
      studentId,
      flags,
      at: new Date().toISOString(),
    }),
  );
}

/**
 * Start a session at the student's *current* level (read fresh from the DB).
 * STANDARD runs against the level time limit and can level up; REVIEW is
 * untimed drill-only; CHALLENGE is a harder timed drill without level-up.
 */
export async function startPracticeSession(
  student: StudentContext,
  mode: PracticeMode = PracticeMode.STANDARD,
): Promise<string> {
  const row = await prisma.user.findUnique({
    where: { id: student.id },
    select: {
      currentLevel: {
        select: {
          id: true,
          name: true,
          questionCount: true,
          timeLimitSeconds: true,
          operation: true,
          termsPerQuestion: true,
          minNumber: true,
          maxNumber: true,
          bankOnly: true,
        },
      },
    },
  });

  const level = row?.currentLevel;
  if (!level) {
    throw new Error("No level assigned.");
  }

  await assertStudentLevelAccess(student.id, student.instituteId, level.id);

  const standardTimeLimitSeconds = await resolveStudentPracticeTimeLimit(
    student.id,
    level.id,
    level.timeLimitSeconds,
  );

  const startedAt = new Date();
  let timeLimitSeconds: number;
  let expiresAt: Date;

  if (mode === PracticeMode.REVIEW) {
    timeLimitSeconds = level.timeLimitSeconds;
    expiresAt = new Date(startedAt.getTime() + 24 * 60 * 60 * 1000);
  } else if (mode === PracticeMode.CHALLENGE) {
    timeLimitSeconds = resolveChallengeTimeLimitSeconds(
      standardTimeLimitSeconds,
    );
    expiresAt = new Date(startedAt.getTime() + timeLimitSeconds * 1000);
  } else {
    timeLimitSeconds = standardTimeLimitSeconds;
    expiresAt = new Date(startedAt.getTime() + timeLimitSeconds * 1000);
  }

  let questions;
  try {
    questions = await buildSessionQuestionsForStudent({
      instituteId: student.instituteId,
      studentId: student.id,
      level: {
        id: level.id,
        questionCount: level.questionCount,
        operation: level.operation,
        termsPerQuestion: level.termsPerQuestion,
        minNumber: level.minNumber,
        maxNumber: level.maxNumber,
        bankOnly: level.bankOnly,
      },
    });
  } catch (error) {
    if (error instanceof InsufficientBankError) {
      await notifyTeacherGroupBankBlocked({
        instituteId: student.instituteId,
        studentId: student.id,
        levelId: level.id,
        levelName: level.name,
        available: error.available,
        required: error.required,
      });
    }
    throw error;
  }

  const curriculumVersionId = await getActiveCurriculumVersionId(
    student.instituteId,
  );

  const session = await prisma.practiceSession.create({
    data: {
      instituteId: student.instituteId,
      studentId: student.id,
      levelId: level.id,
      mode,
      curriculumVersionId,
      startedAt,
      expiresAt,
      totalQuestions: questions.length,
      questions: {
        create: questions.map((q, index) => ({
          index,
          prompt: q.prompt,
          correctAnswer: q.correctAnswer,
          sourceQuestionId: q.sourceQuestionId,
        })),
      },
    },
    select: { id: true },
  });

  return session.id;
}

/**
 * Fetch a session that belongs to this student. `correctAnswer` is included so
 * results can be shown after completion — callers MUST NOT forward it to the
 * client while the session is still IN_PROGRESS.
 */
export function getStudentSession(studentId: string, sessionId: string) {
  return prisma.practiceSession.findFirst({
    where: { id: sessionId, studentId },
    select: {
      id: true,
      status: true,
      mode: true,
      scheduledExamId: true,
      scheduledExam: { select: { title: true } },
      startedAt: true,
      expiresAt: true,
      submittedAt: true,
      totalQuestions: true,
      correctCount: true,
      accuracy: true,
      passed: true,
      leveledUp: true,
      level: { select: { name: true, passAccuracy: true } },
      questions: {
        orderBy: { index: "asc" },
        select: {
          id: true,
          index: true,
          prompt: true,
          correctAnswer: true,
          studentAnswer: true,
          isCorrect: true,
        },
      },
    },
  });
}

/** The student's most recent unfinished session, if any. */
export function getStudentInProgressSession(studentId: string) {
  return prisma.practiceSession.findFirst({
    where: { studentId, status: SessionStatus.IN_PROGRESS },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      mode: true,
      expiresAt: true,
      level: { select: { name: true } },
    },
  });
}

/** Recent attempts for the practice home history list. */
export function listRecentSessions(studentId: string, take = 10) {
  return prisma.practiceSession.findMany({
    where: { studentId },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      status: true,
      mode: true,
      accuracy: true,
      passed: true,
      leveledUp: true,
      createdAt: true,
      levelId: true,
      level: { select: { name: true } },
    },
  });
}

export interface SubmitResult {
  status: SessionStatus;
  correctCount: number;
  totalQuestions: number;
  accuracy: number;
  passed: boolean;
  leveledUp: boolean;
}

/**
 * Grade a submission. All correctness/timing/level-up decisions are made here
 * from the stored questions and the server clock. Idempotent: re-submitting a
 * finished session just returns its stored result.
 */
export async function submitPracticeSession(
  student: StudentContext,
  sessionId: string,
  answers: { id: string; answer: number | null }[],
  telemetry: PracticeSubmitTelemetry = {},
): Promise<SubmitResult> {
  const now = new Date();

  const txResult = await prisma.$transaction(async (tx) => {
    const session = await tx.practiceSession.findFirst({
      where: { id: sessionId, studentId: student.id },
      select: {
        id: true,
        status: true,
        mode: true,
        startedAt: true,
        expiresAt: true,
        levelId: true,
        totalQuestions: true,
        correctCount: true,
        accuracy: true,
        passed: true,
        leveledUp: true,
        level: {
          select: { passAccuracy: true, instituteId: true, orderIndex: true },
        },
        questions: { select: { id: true, correctAnswer: true } },
      },
    });

    if (!session) {
      throw new Error("Session not found.");
    }

    // Idempotent: already graded.
    if (session.status !== SessionStatus.IN_PROGRESS) {
      return {
        status: session.status,
        correctCount: session.correctCount,
        totalQuestions: session.totalQuestions,
        accuracy: session.accuracy,
        passed: session.passed,
        leveledUp: session.leveledUp,
      };
    }

    const submitted = new Map(answers.map((a) => [a.id, a.answer]));
    const { correct, results } = gradeAnswers(session.questions, submitted);

    for (const r of results) {
      await tx.practiceQuestion.update({
        where: { id: r.id },
        data: { studentAnswer: r.studentAnswer, isCorrect: r.isCorrect },
      });
    }

    const total = session.totalQuestions;
    const accuracy = computeAccuracy(correct, total);
    const isReview = session.mode === PracticeMode.REVIEW;
    const isChallenge = session.mode === PracticeMode.CHALLENGE;
    const passAccuracy = isChallenge
      ? resolveChallengePassAccuracy(session.level.passAccuracy)
      : session.level.passAccuracy;
    const expired =
      !isReview && isExpired(now.getTime(), session.expiresAt.getTime());
    const passed = didPass(expired, accuracy, passAccuracy);

    // Level-up: timed standard or exam passes at the student's current level only.
    let leveledUp = false;
    let newLevelId: string | undefined;
    let newLevelName: string | undefined;
    if (
      passed &&
      (session.mode === PracticeMode.STANDARD ||
        session.mode === PracticeMode.EXAM)
    ) {
      const studentRow = await tx.user.findUnique({
        where: { id: student.id },
        select: { currentLevelId: true },
      });
      if (studentRow?.currentLevelId === session.levelId) {
        const next = await tx.level.findFirst({
          where: {
            instituteId: session.level.instituteId,
            orderIndex: { gt: session.level.orderIndex },
            ...ACTIVE_LEVEL_FILTER,
          },
          orderBy: { orderIndex: "asc" },
          select: { id: true, name: true },
        });
        if (next) {
          await tx.user.update({
            where: { id: student.id },
            data: { currentLevelId: next.id },
          });
          leveledUp = true;
          newLevelId = next.id;
          newLevelName = next.name;
        }
      }
    }

    const status = expired ? SessionStatus.EXPIRED : SessionStatus.COMPLETED;

    const tabBlurCount = sanitizeTabBlurCount(telemetry.tabBlurCount);
    const anomalyFlags = collectAnomalyFlags({
      startedAtMs: session.startedAt.getTime(),
      submittedAtMs: now.getTime(),
      questionCount: total,
      checkFastSubmit:
        (session.mode === PracticeMode.STANDARD ||
          session.mode === PracticeMode.CHALLENGE ||
          session.mode === PracticeMode.EXAM) &&
        !expired,
      tabBlurCount,
    });
    if (anomalyFlags.length > 0) {
      logPracticeAnomalies(sessionId, student.id, anomalyFlags);
    }

    await tx.practiceSession.update({
      where: { id: sessionId },
      data: {
        status,
        submittedAt: now,
        correctCount: correct,
        accuracy,
        passed,
        leveledUp,
        anomalyFlags,
      },
    });

    return {
      status,
      correctCount: correct,
      totalQuestions: total,
      accuracy,
      passed,
      leveledUp,
      newLevelId,
      newLevelName,
    };
  });

  if (txResult.leveledUp && txResult.newLevelId && txResult.newLevelName) {
    await notifyStudentLevelUp(student, {
      levelId: txResult.newLevelId,
      levelName: txResult.newLevelName,
    });
  }

  return {
    status: txResult.status,
    correctCount: txResult.correctCount,
    totalQuestions: txResult.totalQuestions,
    accuracy: txResult.accuracy,
    passed: txResult.passed,
    leveledUp: txResult.leveledUp,
  };
}
