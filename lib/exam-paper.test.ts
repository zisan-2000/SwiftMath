import { describe, expect, it } from "vitest";

import { buildFixedExamPaper, createSeededRng } from "@/lib/exam-paper";
import { OperationType } from "@/lib/generated/prisma/enums";

const level = {
  operation: OperationType.ADDITION,
  termsPerQuestion: 2,
  minNumber: 1,
  maxNumber: 9,
  questionCount: 3,
};

const pool = [
  { id: "a", prompt: "1 + 2", correctAnswer: 3, isActive: true },
  { id: "b", prompt: "3 + 4", correctAnswer: 7, isActive: true },
  { id: "c", prompt: "5 + 6", correctAnswer: 11, isActive: true },
  { id: "d", prompt: "7 + 8", correctAnswer: 15, isActive: true },
];

describe("createSeededRng", () => {
  it("returns the same sequence for the same seed", () => {
    const a = createSeededRng("exam-123");
    const b = createSeededRng("exam-123");
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it("returns different sequences for different seeds", () => {
    const a = createSeededRng("exam-a");
    const b = createSeededRng("exam-b");
    expect(a()).not.toBe(b());
  });
});

describe("buildFixedExamPaper", () => {
  it("produces the same paper for the same seed and pool", () => {
    const first = buildFixedExamPaper(level, pool, "paper-seed");
    const second = buildFixedExamPaper(level, pool, "paper-seed");
    expect(first).toEqual(second);
    expect(first.every((q) => q.sourceQuestionId != null)).toBe(true);
  });

  it("can differ when the seed changes", () => {
    const first = buildFixedExamPaper(level, pool, "seed-one");
    const second = buildFixedExamPaper(level, pool, "seed-two");
    expect(first.map((q) => q.prompt)).not.toEqual(second.map((q) => q.prompt));
  });
});
