import { describe, expect, it } from "vitest";

import {
  DEFAULT_GLOBAL_RANKING_STEP,
  buildCanonicalGlobalLevelWhere,
  formatCanonicalLevelRules,
  getGlobalRankingLevelName,
  globalRankingHref,
  parseGlobalRankingLevelStep,
} from "@/lib/global-ranking";
import { OperationType } from "@/lib/generated/prisma/enums";

describe("parseGlobalRankingLevelStep", () => {
  it("returns the requested valid step", () => {
    expect(parseGlobalRankingLevelStep("3")).toBe(3);
  });

  it("falls back to the default step for all or missing", () => {
    expect(parseGlobalRankingLevelStep(undefined)).toBe(
      DEFAULT_GLOBAL_RANKING_STEP,
    );
    expect(parseGlobalRankingLevelStep("all")).toBe(DEFAULT_GLOBAL_RANKING_STEP);
    expect(parseGlobalRankingLevelStep("invalid")).toBe(
      DEFAULT_GLOBAL_RANKING_STEP,
    );
  });
});

describe("getGlobalRankingLevelName", () => {
  it("returns the starter level name for a known step", () => {
    expect(getGlobalRankingLevelName(1)).toBe("Addition I");
  });
});

describe("globalRankingHref", () => {
  it("always includes a step and optionally period", () => {
    expect(globalRankingHref(2)).toBe("/student/ranking/global?step=2");
    expect(globalRankingHref(2, "week")).toBe(
      "/student/ranking/global?step=2&period=week",
    );
  });
});

describe("buildCanonicalGlobalLevelWhere", () => {
  it("matches all platform default scoring fields for a step", () => {
    expect(buildCanonicalGlobalLevelWhere(1)).toEqual({
      orderIndex: 1,
      operation: OperationType.ADDITION,
      termsPerQuestion: 2,
      minNumber: 1,
      maxNumber: 9,
      questionCount: 10,
      timeLimitSeconds: 120,
      passAccuracy: 70,
    });
  });

  it("throws for an unknown step", () => {
    expect(() => buildCanonicalGlobalLevelWhere(99)).toThrow(
      "Unknown global ranking step: 99",
    );
  });
});

describe("formatCanonicalLevelRules", () => {
  it("summarises the default rules for UI copy", () => {
    expect(formatCanonicalLevelRules(1)).toBe(
      "10 questions · 120s · pass 70%",
    );
  });
});
