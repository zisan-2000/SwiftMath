import { describe, expect, it } from "vitest";

import { DEFAULT_STARTER_LEVELS } from "@/lib/default-levels";
import { OperationType } from "@/lib/generated/prisma/enums";
import { generateQuestion } from "@/lib/practice-logic";

describe("DEFAULT_STARTER_LEVELS", () => {
  it("provides nine ordered levels for a new institute", () => {
    expect(DEFAULT_STARTER_LEVELS).toHaveLength(9);

    const orderIndexes = DEFAULT_STARTER_LEVELS.map((l) => l.orderIndex);
    expect(orderIndexes).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it("includes multiplication and division in the progression", () => {
    const operations = DEFAULT_STARTER_LEVELS.map((l) => l.operation);
    expect(operations).toContain(OperationType.MULTIPLICATION);
    expect(operations).toContain(OperationType.DIVISION);
  });

  it("keeps every level within valid practice bounds", () => {
    for (const level of DEFAULT_STARTER_LEVELS) {
      expect(level.name.length).toBeGreaterThan(0);
      expect(level.termsPerQuestion).toBeGreaterThanOrEqual(2);
      expect(level.minNumber).toBeLessThanOrEqual(level.maxNumber);
      expect(level.questionCount).toBeGreaterThan(0);
      expect(level.timeLimitSeconds).toBeGreaterThan(0);
      expect(level.passAccuracy).toBeGreaterThanOrEqual(0);
      expect(level.passAccuracy).toBeLessThanOrEqual(100);
    }
  });

  it("generates valid questions for every × and ÷ level", () => {
    const mulDiv = DEFAULT_STARTER_LEVELS.filter(
      (l) =>
        l.operation === OperationType.MULTIPLICATION ||
        l.operation === OperationType.DIVISION,
    );
    expect(mulDiv.length).toBeGreaterThan(0);

    for (const level of mulDiv) {
      for (let i = 0; i < 50; i++) {
        const q = generateQuestion(level);
        expect(q.prompt.length).toBeGreaterThan(0);
        expect(Number.isInteger(q.correctAnswer)).toBe(true);
        if (level.operation === OperationType.DIVISION) {
          expect(q.correctAnswer).toBeGreaterThanOrEqual(1);
        } else {
          expect(q.correctAnswer).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });
});
