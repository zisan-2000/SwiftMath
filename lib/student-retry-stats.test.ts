import { describe, expect, it } from "vitest";

import { PracticeMode, SessionStatus } from "@/lib/generated/prisma/enums";

import {
  failedStandardSessionWhere,
  formatRetryCountDisplay,
} from "@/lib/student-retry-stats";

describe("failedStandardSessionWhere", () => {
  it("matches finished standard sessions that did not pass", () => {
    expect(failedStandardSessionWhere("student-1")).toEqual({
      studentId: "student-1",
      mode: PracticeMode.STANDARD,
      status: { not: SessionStatus.IN_PROGRESS },
      passed: false,
    });
  });

  it("scopes to a level when provided", () => {
    expect(failedStandardSessionWhere("student-1", "level-1")).toEqual({
      studentId: "student-1",
      mode: PracticeMode.STANDARD,
      status: { not: SessionStatus.IN_PROGRESS },
      passed: false,
      levelId: "level-1",
    });
  });
});

describe("formatRetryCountDisplay", () => {
  it("describes total-only when no current level", () => {
    expect(formatRetryCountDisplay(4, null)).toEqual({
      atCurrentLevel: null,
      total: 4,
      hint: "Failed timed attempts (all levels)",
    });
  });

  it("combines current-level and overall counts in the hint", () => {
    expect(formatRetryCountDisplay(7, 3)).toEqual({
      atCurrentLevel: 3,
      total: 7,
      hint: "3 at current level · 7 overall",
    });
  });
});
