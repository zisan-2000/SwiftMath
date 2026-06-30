import { describe, expect, it } from "vitest";

import {
  buildQuestionAnalyticsMap,
  formatQuestionAnalyticsLabel,
} from "@/lib/question-analytics";

describe("buildQuestionAnalyticsMap", () => {
  it("aggregates attempts and success rate per bank question", () => {
    const map = buildQuestionAnalyticsMap([
      { sourceQuestionId: "q1", isCorrect: true },
      { sourceQuestionId: "q1", isCorrect: false },
      { sourceQuestionId: "q2", isCorrect: true },
    ]);

    expect(map.get("q1")).toEqual({
      attemptCount: 2,
      correctCount: 1,
      successRate: 50,
    });
    expect(map.get("q2")).toEqual({
      attemptCount: 1,
      correctCount: 1,
      successRate: 100,
    });
  });
});

describe("formatQuestionAnalyticsLabel", () => {
  it("returns null when there is no data", () => {
    expect(formatQuestionAnalyticsLabel(undefined)).toBeNull();
  });

  it("formats attempt count and success rate", () => {
    expect(
      formatQuestionAnalyticsLabel({
        attemptCount: 3,
        correctCount: 2,
        successRate: 67,
      }),
    ).toBe("3 attempts · 67% correct");
  });
});
