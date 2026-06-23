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
import { PracticeMode, SessionStatus } from "@/lib/generated/prisma/enums";
import { assertStudentLevelAccess } from "@/server/level-access";
import {
  collectAnomalyFlags,
  sanitizeTabBlurCount,
} from "@/lib/practice-anomaly";
import {
  computeAccuracy,
  didPass,
  generateQuestion,
  gradeAnswers,
  isExpired,
} from "@/lib/practice-logic";

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
 * untimed drill-only. Returns the new session id.
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

  const level = row?.currentLevel;
  if (!level) {
    throw new Error("No level assigned.");
  }

  await assertStudentLevelAccess(student.id, student.instituteId, level.id);

  const startedAt = new Date();
  const expiresAt =
    mode === PracticeMode.REVIEW
      ? new Date(startedAt.getTime() + 24 * 60 * 60 * 1000)
      : new Date(startedAt.getTime() + level.timeLimitSeconds * 1000);

  const questions = Array.from({ length: level.questionCount }, (_, index) => {
    const q = generateQuestion(level);
    return { index, prompt: q.prompt, correctAnswer: q.correctAnswer };
  });

  const session = await prisma.practiceSession.create({
    data: {
      instituteId: student.instituteId,
      studentId: student.id,
      levelId: level.id,
      mode,
      startedAt,
      expiresAt,
      totalQuestions: questions.length,
      questions: { create: questions },
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

  return prisma.$transaction(async (tx) => {
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
    const expired =
      !isReview && isExpired(now.getTime(), session.expiresAt.getTime());
    const passed = didPass(expired, accuracy, session.level.passAccuracy);

    // Level-up: timed standard passes at the student's current level only.
    let leveledUp = false;
    if (passed && !isReview) {
      const studentRow = await tx.user.findUnique({
        where: { id: student.id },
        select: { currentLevelId: true },
      });
      if (studentRow?.currentLevelId === session.levelId) {
        const next = await tx.level.findFirst({
          where: {
            instituteId: session.level.instituteId,
            orderIndex: { gt: session.level.orderIndex },
          },
          orderBy: { orderIndex: "asc" },
          select: { id: true },
        });
        if (next) {
          await tx.user.update({
            where: { id: student.id },
            data: { currentLevelId: next.id },
          });
          leveledUp = true;
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
        !isReview && session.mode === PracticeMode.STANDARD && !expired,
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
    };
  });
}
