import { describe, expect, it } from "vitest";

import {
  composeSessionQuestions,
  filterEnabledBankQuestions,
  pickBankQuestions,
  assessLevelBankCoverage,
} from "@/lib/question-bank";
import { OperationType } from "@/lib/generated/prisma/enums";

const level = {
  operation: OperationType.ADDITION,
  termsPerQuestion: 2,
  minNumber: 1,
  maxNumber: 9,
};

describe("filterEnabledBankQuestions", () => {
  it("excludes inactive and group-disabled rows", () => {
    const pool = filterEnabledBankQuestions(
      [
        { id: "a", prompt: "1+1", correctAnswer: 2, isActive: true },
        { id: "b", prompt: "2+2", correctAnswer: 4, isActive: false },
        { id: "c", prompt: "3+3", correctAnswer: 6, isActive: true },
      ],
      new Set(["c"]),
    );
    expect(pool.map((q) => q.id)).toEqual(["a"]);
  });
});

describe("pickBankQuestions", () => {
  it("returns at most count items without replacement", () => {
    const pool = [
      { id: "a", prompt: "1+1", correctAnswer: 2, isActive: true },
      { id: "b", prompt: "2+2", correctAnswer: 4, isActive: true },
      { id: "c", prompt: "3+3", correctAnswer: 6, isActive: true },
    ];
    const picked = pickBankQuestions(pool, 2, () => 0);
    expect(picked).toHaveLength(2);
    expect(new Set(picked.map((q) => q.id)).size).toBe(2);
  });
});

describe("composeSessionQuestions", () => {
  it("uses bank rows then fills remainder dynamically", () => {
    const drafts = composeSessionQuestions(
      level,
      3,
      [{ id: "q1", prompt: "4 + 5", correctAnswer: 9, isActive: true }],
      () => 0.5,
    );
    expect(drafts).toHaveLength(3);
    expect(drafts[0]?.sourceQuestionId).toBe("q1");
    expect(drafts[0]?.prompt).toBe("4 + 5");
    expect(drafts.filter((d) => d.sourceQuestionId == null).length).toBe(2);
  });

  it("generates all dynamically when bank is empty", () => {
    const drafts = composeSessionQuestions(level, 2, [], () => 0.5);
    expect(drafts.every((d) => d.sourceQuestionId == null)).toBe(true);
  });
});

describe("assessLevelBankCoverage", () => {
  it("reports empty, partial, and ok states", () => {
    expect(
      assessLevelBankCoverage({
        sessionQuestionCount: 10,
        totalBankCount: 0,
        activeBankCount: 0,
      }).status,
    ).toBe("empty");

    expect(
      assessLevelBankCoverage({
        sessionQuestionCount: 10,
        totalBankCount: 5,
        activeBankCount: 3,
      }).status,
    ).toBe("partial");

    expect(
      assessLevelBankCoverage({
        sessionQuestionCount: 10,
        totalBankCount: 12,
        activeBankCount: 10,
      }).status,
    ).toBe("ok");
  });
});
