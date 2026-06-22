import { describe, expect, it } from "vitest";

import { OperationType } from "@/lib/generated/prisma/enums";
import {
  computeAccuracy,
  didPass,
  gradeAnswers,
  generateQuestion,
  isExpired,
  randInt,
  SUBMIT_GRACE_MS,
  type LevelConfig,
  type Rng,
} from "@/lib/practice-logic";

/** Deterministic PRNG (mulberry32) so generation tests are repeatable. */
function makeRng(seed: number): Rng {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Evaluate a generated prompt left-to-right. Valid because every generated
 * prompt uses a single precedence level (all +, all ×, all −, single ÷) or a
 * left-to-right +/− sequence (MIXED).
 */
function evalPrompt(prompt: string): number {
  const tokens = prompt.split(" ");
  let acc = Number(tokens[0]);
  for (let i = 1; i < tokens.length; i += 2) {
    const op = tokens[i];
    const n = Number(tokens[i + 1]);
    if (op === "+") acc += n;
    else if (op === "−") acc -= n;
    else if (op === "×") acc *= n;
    else if (op === "÷") acc /= n;
    else throw new Error(`Unexpected operator: ${op}`);
  }
  return acc;
}

describe("randInt", () => {
  it("stays within the inclusive range", () => {
    const rng = makeRng(1);
    for (let i = 0; i < 1000; i++) {
      const n = randInt(3, 9, rng);
      expect(n).toBeGreaterThanOrEqual(3);
      expect(n).toBeLessThanOrEqual(9);
      expect(Number.isInteger(n)).toBe(true);
    }
  });

  it("handles reversed bounds", () => {
    const n = randInt(9, 3, () => 0);
    expect(n).toBe(3);
  });

  it("returns the only value when min === max", () => {
    expect(randInt(7, 7, () => 0.999)).toBe(7);
  });
});

describe("generateQuestion", () => {
  const base = { termsPerQuestion: 4, minNumber: 1, maxNumber: 12 };

  const operations: OperationType[] = [
    OperationType.ADDITION,
    OperationType.SUBTRACTION,
    OperationType.MULTIPLICATION,
    OperationType.DIVISION,
    OperationType.MIXED,
  ];

  for (const operation of operations) {
    it(`${operation}: correctAnswer matches the prompt`, () => {
      const level: LevelConfig = { ...base, operation };
      for (let seed = 0; seed < 200; seed++) {
        const q = generateQuestion(level, makeRng(seed));
        expect(evalPrompt(q.prompt)).toBe(q.correctAnswer);
      }
    });
  }

  it("SUBTRACTION never goes negative", () => {
    const level: LevelConfig = { ...base, operation: OperationType.SUBTRACTION };
    for (let seed = 0; seed < 200; seed++) {
      const q = generateQuestion(level, makeRng(seed));
      expect(q.correctAnswer).toBeGreaterThanOrEqual(0);
    }
  });

  it("MIXED never goes negative", () => {
    const level: LevelConfig = { ...base, operation: OperationType.MIXED };
    for (let seed = 0; seed < 200; seed++) {
      const q = generateQuestion(level, makeRng(seed));
      expect(q.correctAnswer).toBeGreaterThanOrEqual(0);
    }
  });

  it("DIVISION yields an integer quotient", () => {
    const level: LevelConfig = { ...base, operation: OperationType.DIVISION };
    for (let seed = 0; seed < 200; seed++) {
      const q = generateQuestion(level, makeRng(seed));
      expect(Number.isInteger(q.correctAnswer)).toBe(true);
      expect(q.correctAnswer).toBeGreaterThanOrEqual(1);
    }
  });

  it("respects a minimum of 2 terms even when configured lower", () => {
    const level: LevelConfig = {
      operation: OperationType.ADDITION,
      termsPerQuestion: 1,
      minNumber: 5,
      maxNumber: 5,
    };
    const q = generateQuestion(level, () => 0);
    // Two terms of 5 → "5 + 5".
    expect(q.prompt).toBe("5 + 5");
    expect(q.correctAnswer).toBe(10);
  });
});

describe("computeAccuracy", () => {
  it("computes a rounded percentage", () => {
    expect(computeAccuracy(7, 10)).toBe(70);
    expect(computeAccuracy(1, 3)).toBe(33); // 33.33 → 33
    expect(computeAccuracy(2, 3)).toBe(67); // 66.66 → 67
    expect(computeAccuracy(10, 10)).toBe(100);
  });

  it("is 0 when there are no questions", () => {
    expect(computeAccuracy(0, 0)).toBe(0);
  });
});

describe("isExpired", () => {
  const expiresAt = 10_000;

  it("is false before the deadline", () => {
    expect(isExpired(9_000, expiresAt)).toBe(false);
  });

  it("is false within the grace window", () => {
    expect(isExpired(expiresAt + SUBMIT_GRACE_MS, expiresAt)).toBe(false);
  });

  it("is true just past the grace window", () => {
    expect(isExpired(expiresAt + SUBMIT_GRACE_MS + 1, expiresAt)).toBe(true);
  });
});

describe("didPass", () => {
  it("passes when in time and at/above the bar", () => {
    expect(didPass(false, 80, 75)).toBe(true);
    expect(didPass(false, 75, 75)).toBe(true);
  });

  it("fails below the bar", () => {
    expect(didPass(false, 74, 75)).toBe(false);
  });

  it("never passes when expired, even at 100%", () => {
    expect(didPass(true, 100, 75)).toBe(false);
  });
});

describe("gradeAnswers", () => {
  const questions = [
    { id: "a", correctAnswer: 10 },
    { id: "b", correctAnswer: 20 },
    { id: "c", correctAnswer: 30 },
  ];

  it("counts correct answers and marks each result", () => {
    const submitted = new Map<string, number | null>([
      ["a", 10],
      ["b", 99],
      ["c", 30],
    ]);
    const { correct, results } = gradeAnswers(questions, submitted);
    expect(correct).toBe(2);
    expect(results).toEqual([
      { id: "a", studentAnswer: 10, isCorrect: true },
      { id: "b", studentAnswer: 99, isCorrect: false },
      { id: "c", studentAnswer: 30, isCorrect: true },
    ]);
  });

  it("treats missing and null answers as incorrect", () => {
    const submitted = new Map<string, number | null>([["b", null]]);
    const { correct, results } = gradeAnswers(questions, submitted);
    expect(correct).toBe(0);
    expect(results.map((r) => r.studentAnswer)).toEqual([null, null, null]);
    expect(results.every((r) => !r.isCorrect)).toBe(true);
  });

  it("does not count 0 as a missing answer", () => {
    const zeroQ = [{ id: "z", correctAnswer: 0 }];
    const submitted = new Map<string, number | null>([["z", 0]]);
    const { correct } = gradeAnswers(zeroQ, submitted);
    expect(correct).toBe(1);
  });
});
