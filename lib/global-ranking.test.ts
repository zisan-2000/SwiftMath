import { describe, expect, it } from "vitest";

import {
  DEFAULT_GLOBAL_RANKING_STEP,
  getGlobalRankingLevelName,
  globalRankingHref,
  parseGlobalRankingLevelStep,
} from "@/lib/global-ranking";

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
