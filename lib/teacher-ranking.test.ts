import { describe, expect, it } from "vitest";

import {
  buildTeacherRankingSubtitle,
  buildTeacherRankingViewValue,
  parseTeacherRankingView,
} from "@/lib/teacher-ranking";

describe("parseTeacherRankingView", () => {
  const owned = new Set(["g1", "g2"]);

  it("defaults to institute scope", () => {
    expect(parseTeacherRankingView(undefined, owned)).toEqual({
      scope: "institute",
    });
  });

  it("supports all my groups", () => {
    expect(parseTeacherRankingView("mine", owned)).toEqual({
      scope: "mine",
    });
  });

  it("accepts an owned group", () => {
    expect(parseTeacherRankingView("group:g1", owned)).toEqual({
      scope: "group",
      groupId: "g1",
    });
  });

  it("rejects a group the teacher does not own", () => {
    expect(parseTeacherRankingView("group:other", owned)).toEqual({
      scope: "institute",
    });
  });
});

describe("buildTeacherRankingViewValue", () => {
  it("round-trips group scope", () => {
    expect(buildTeacherRankingViewValue("group", "g1")).toBe("group:g1");
  });
});

describe("buildTeacherRankingSubtitle", () => {
  it("describes institute scope", () => {
    expect(
      buildTeacherRankingSubtitle(5, {
        scope: "institute",
        groupName: null,
        period: "all",
        levelName: null,
      }),
    ).toBe("5 qualifying students in your institute.");
  });
});
