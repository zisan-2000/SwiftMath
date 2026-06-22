// Pure, framework- and DB-agnostic practice logic.
//
// This module holds the deterministic core of the practice engine — question
// generation and grading/timing math — with NO `server-only`, Prisma, or
// network imports. The trusted server engine (`server/practice.ts`) composes
// these helpers inside its transactions, and unit tests exercise them directly.
//
// An optional `rng` is injectable everywhere randomness is used so tests can
// make generation deterministic.

import { OperationType } from "@/lib/generated/prisma/enums";

/** A few seconds of slack for network/clock skew on the submit request. */
export const SUBMIT_GRACE_MS = 2000;

/** Source of randomness in [0, 1). Defaults to Math.random; injectable for tests. */
export type Rng = () => number;

/** Level fields the question generator needs. */
export interface LevelConfig {
  operation: OperationType;
  termsPerQuestion: number;
  minNumber: number;
  maxNumber: number;
}

export interface GeneratedQuestion {
  prompt: string;
  correctAnswer: number;
}

/** Inclusive random integer in [min, max]. */
export function randInt(min: number, max: number, rng: Rng = Math.random): number {
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  return Math.floor(rng() * (hi - lo + 1)) + lo;
}

/**
 * Generate one question for a level. Subtraction and the subtractive part of
 * mixed are constructed so the running total never goes negative (abacus
 * practice uses whole, non-negative numbers); division is constructed to divide
 * evenly.
 */
export function generateQuestion(
  level: LevelConfig,
  rng: Rng = Math.random,
): GeneratedQuestion {
  const { operation, minNumber, maxNumber } = level;
  const terms = Math.max(2, level.termsPerQuestion);

  switch (operation) {
    case OperationType.ADDITION: {
      const nums = Array.from({ length: terms }, () =>
        randInt(minNumber, maxNumber, rng),
      );
      return {
        prompt: nums.join(" + "),
        correctAnswer: nums.reduce((a, b) => a + b, 0),
      };
    }

    case OperationType.MULTIPLICATION: {
      const nums = Array.from({ length: terms }, () =>
        randInt(minNumber, maxNumber, rng),
      );
      return {
        prompt: nums.join(" × "),
        correctAnswer: nums.reduce((a, b) => a * b, 1),
      };
    }

    case OperationType.DIVISION: {
      // Build a clean division: dividend = divisor × quotient.
      const divisor = randInt(Math.max(1, minNumber), Math.max(1, maxNumber), rng);
      const quotient = randInt(Math.max(1, minNumber), Math.max(1, maxNumber), rng);
      return {
        prompt: `${divisor * quotient} ÷ ${divisor}`,
        correctAnswer: quotient,
      };
    }

    case OperationType.SUBTRACTION: {
      const nums = [randInt(minNumber, maxNumber, rng)];
      let running = nums[0];
      for (let i = 1; i < terms; i++) {
        const hi = Math.min(maxNumber, running);
        if (hi < minNumber) break; // can't subtract more without going negative
        const t = randInt(minNumber, hi, rng);
        nums.push(t);
        running -= t;
      }
      return { prompt: nums.join(" − "), correctAnswer: running };
    }

    case OperationType.MIXED: {
      const nums = [randInt(minNumber, maxNumber, rng)];
      const ops: string[] = [];
      let running = nums[0];
      for (let i = 1; i < terms; i++) {
        // Alternate subtract / add, keeping the running total non-negative.
        const subtract = i % 2 === 1;
        if (subtract) {
          const hi = Math.min(maxNumber, running);
          if (hi < minNumber) {
            // fall back to adding instead of going negative
            const t = randInt(minNumber, maxNumber, rng);
            nums.push(t);
            ops.push("+");
            running += t;
          } else {
            const t = randInt(minNumber, hi, rng);
            nums.push(t);
            ops.push("−");
            running -= t;
          }
        } else {
          const t = randInt(minNumber, maxNumber, rng);
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

/** A stored question, reduced to what grading needs. */
export interface GradableQuestion {
  id: string;
  correctAnswer: number;
}

/** Per-question grading outcome, ready to persist. */
export interface GradedQuestion {
  id: string;
  studentAnswer: number | null;
  isCorrect: boolean;
}

/**
 * Grade submitted answers against the stored correct answers. A missing or
 * null answer is always incorrect. Returns the correct count and per-question
 * results (the order matches `questions`).
 */
export function gradeAnswers(
  questions: GradableQuestion[],
  submitted: Map<string, number | null>,
): { correct: number; results: GradedQuestion[] } {
  let correct = 0;
  const results = questions.map((q) => {
    const given = submitted.get(q.id) ?? null;
    const isCorrect = given !== null && given === q.correctAnswer;
    if (isCorrect) correct++;
    return { id: q.id, studentAnswer: given, isCorrect };
  });
  return { correct, results };
}

/** Accuracy as a 0–100 integer percentage. 0 when there are no questions. */
export function computeAccuracy(correct: number, total: number): number {
  return total > 0 ? Math.round((correct / total) * 100) : 0;
}

/** Whether a submission arrived after the deadline (plus grace). */
export function isExpired(
  nowMs: number,
  expiresAtMs: number,
  graceMs: number = SUBMIT_GRACE_MS,
): boolean {
  return nowMs > expiresAtMs + graceMs;
}

/** A pass requires an in-time submission that meets the level's accuracy bar. */
export function didPass(
  expired: boolean,
  accuracy: number,
  passAccuracy: number,
): boolean {
  return !expired && accuracy >= passAccuracy;
}
