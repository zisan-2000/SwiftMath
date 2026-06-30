import { describe, expect, it } from "vitest";

import { DEFAULT_STARTER_LEVELS } from "@/lib/default-levels";
import {
  assessStarterBankCoverage,
  buildStarterQuestionBankRows,
  DEFAULT_STARTER_QUESTION_BANK,
  getStarterQuestionsForLevel,
} from "@/lib/default-question-bank";

describe("DEFAULT_STARTER_QUESTION_BANK", () => {
  it("defines questions for every starter level", () => {
    for (const level of DEFAULT_STARTER_LEVELS) {
      expect(getStarterQuestionsForLevel(level.orderIndex).length).toBeGreaterThan(
        0,
      );
    }
  });

  it("covers session size for every starter level", () => {
    const coverage = assessStarterBankCoverage(DEFAULT_STARTER_LEVELS);
    expect(coverage.ok).toBe(true);
  });

  it("has 10 questions per curriculum step", () => {
    for (const level of DEFAULT_STARTER_LEVELS) {
      expect(DEFAULT_STARTER_QUESTION_BANK[level.orderIndex]).toHaveLength(10);
    }
  });

  it("builds insert rows with institute and level ids", () => {
    const rows = buildStarterQuestionBankRows({
      instituteId: "inst-1",
      levels: [
        { id: "lvl-1", orderIndex: 1 },
        { id: "lvl-2", orderIndex: 2 },
      ],
      curriculumVersionId: "cv-1",
    });

    expect(rows).toHaveLength(20);
    expect(rows[0]).toMatchObject({
      instituteId: "inst-1",
      levelId: "lvl-1",
      prompt: "3 + 4",
      correctAnswer: 7,
      orderIndex: 0,
      isActive: true,
    });
  });
});
