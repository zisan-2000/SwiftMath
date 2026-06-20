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
import { OperationType, SessionStatus } from "@/lib/generated/prisma/enums";

/** A few seconds of slack for network/clock skew on the submit request. */
const SUBMIT_GRACE_MS = 2000;

/** The authenticated student, as needed for scoping. */
export interface StudentContext {
  id: string;
  instituteId: string;
}

/** Level fields the question generator needs. */
interface LevelConfig {
  operation: OperationType;
  termsPerQuestion: number;
  minNumber: number;
  maxNumber: number;
}

interface GeneratedQuestion {
  prompt: string;
  correctAnswer: number;
}

/** Inclusive random integer in [min, max]. */
function randInt(min: number, max: number): number {
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  return Math.floor(Math.random() * (hi - lo + 1)) + lo;
}

/**
 * Generate one question for a level. Subtraction and the subtractive part of
 * mixed are constructed so the running total never goes negative (abacus
 * practice uses whole, non-negative numbers); division is constructed to divide
 * evenly.
 */
function generateQuestion(level: LevelConfig): GeneratedQuestion {
  const { operation, minNumber, maxNumber } = level;
  const terms = Math.max(2, level.termsPerQuestion);

  switch (operation) {
    case OperationType.ADDITION: {
      const nums = Array.from({ length: terms }, () =>
        randInt(minNumber, maxNumber),
      );
      return {
        prompt: nums.join(" + "),
        correctAnswer: nums.reduce((a, b) => a + b, 0),
      };
    }

    case OperationType.MULTIPLICATION: {
      const nums = Array.from({ length: terms }, () =>
        randInt(minNumber, maxNumber),
      );
      return {
        prompt: nums.join(" × "),
        correctAnswer: nums.reduce((a, b) => a * b, 1),
      };
    }

    case OperationType.DIVISION: {
      // Build a clean division: dividend = divisor × quotient.
      const divisor = randInt(Math.max(1, minNumber), Math.max(1, maxNumber));
      const quotient = randInt(Math.max(1, minNumber), Math.max(1, maxNumber));
      return {
        prompt: `${divisor * quotient} ÷ ${divisor}`,
        correctAnswer: quotient,
      };
    }

    case OperationType.SUBTRACTION: {
      const nums = [randInt(minNumber, maxNumber)];
      let running = nums[0];
      for (let i = 1; i < terms; i++) {
        const hi = Math.min(maxNumber, running);
        if (hi < minNumber) break; // can't subtract more without going negative
        const t = randInt(minNumber, hi);
        nums.push(t);
        running -= t;
      }
      return { prompt: nums.join(" − "), correctAnswer: running };
    }

    case OperationType.MIXED: {
      const nums = [randInt(minNumber, maxNumber)];
      const ops: string[] = [];
      let running = nums[0];
      for (let i = 1; i < terms; i++) {
        // Alternate subtract / add, keeping the running total non-negative.
        const subtract = i % 2 === 1;
        if (subtract) {
          const hi = Math.min(maxNumber, running);
          if (hi < minNumber) {
            // fall back to adding instead of going negative
            const t = randInt(minNumber, maxNumber);
            nums.push(t);
            ops.push("+");
            running += t;
          } else {
            const t = randInt(minNumber, hi);
            nums.push(t);
            ops.push("−");
            running -= t;
          }
        } else {
          const t = randInt(minNumber, maxNumber);
          nums.push(t);
          ops.push("+");
          running += t;
        }
      }
      let prompt = String(nums[0]);
      for (let i = 1; i < nums.length; i++) prompt += ` ${ops[i - 1]} ${nums[i]}`;
      return { prompt, correctAnswer: running };
    }
  }
}

/**
 * Start a timed session at the student's *current* level (read fresh from the
 * DB, never trusted from the session). Returns the new session id.
 * Throws if the student has no level assigned.
 */
export async function startPracticeSession(
  student: StudentContext,
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

  const startedAt = new Date();
  const expiresAt = new Date(startedAt.getTime() + level.timeLimitSeconds * 1000);

  const questions = Array.from({ length: level.questionCount }, (_, index) => {
    const q = generateQuestion(level);
    return { index, prompt: q.prompt, correctAnswer: q.correctAnswer };
  });

  const session = await prisma.practiceSession.create({
    data: {
      instituteId: student.instituteId,
      studentId: student.id,
      levelId: level.id,
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
): Promise<SubmitResult> {
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const session = await tx.practiceSession.findFirst({
      where: { id: sessionId, studentId: student.id },
      select: {
        id: true,
        status: true,
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

    let correct = 0;
    for (const q of session.questions) {
      const given = submitted.get(q.id) ?? null;
      const isCorrect = given !== null && given === q.correctAnswer;
      if (isCorrect) correct++;
      await tx.practiceQuestion.update({
        where: { id: q.id },
        data: { studentAnswer: given, isCorrect },
      });
    }

    const total = session.totalQuestions;
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
    const expired = now.getTime() > session.expiresAt.getTime() + SUBMIT_GRACE_MS;
    const passed = !expired && accuracy >= session.level.passAccuracy;

    // Level-up: only when this attempt was at the student's *current* level.
    let leveledUp = false;
    if (passed) {
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
    await tx.practiceSession.update({
      where: { id: sessionId },
      data: {
        status,
        submittedAt: now,
        correctCount: correct,
        accuracy,
        passed,
        leveledUp,
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
