import { describe, expect, it } from "vitest";

import {
  filterQualifiedLeaderboardRows,
  formatPassDuration,
  applyStrictHundredPercentRule,
  formatStrictHundredPolicy,
  leaderboardPeriodStart,
  parseLeaderboardPeriod,
  rankLeaderboardRows,
  strictHundredPeriodStart,
  type LeaderboardRow,
} from "@/lib/ranking";

describe("parseLeaderboardPeriod", () => {
  it("accepts week and month", () => {
    expect(parseLeaderboardPeriod("week")).toBe("week");
    expect(parseLeaderboardPeriod("month")).toBe("month");
  });

  it("falls back to all for unknown values", () => {
    expect(parseLeaderboardPeriod(undefined)).toBe("all");
    expect(parseLeaderboardPeriod("year")).toBe("all");
  });
});

describe("leaderboardPeriodStart", () => {
  it("returns null for all-time", () => {
    expect(leaderboardPeriodStart("all")).toBeNull();
  });

  it("covers the last seven calendar days for week", () => {
    const now = new Date(2026, 5, 23, 15, 30, 0);
    const start = leaderboardPeriodStart("week", now);
    expect(start).toEqual(new Date(2026, 5, 17, 0, 0, 0, 0));
  });

  it("covers the last thirty calendar days for month", () => {
    const now = new Date(2026, 5, 23, 15, 30, 0);
    const start = leaderboardPeriodStart("month", now);
    expect(start).toEqual(new Date(2026, 4, 25, 0, 0, 0, 0));
  });
});

describe("strictHundredPeriodStart", () => {
  it("matches the stats window for week and month", () => {
    const now = new Date(2026, 5, 23, 15, 30, 0);
    expect(strictHundredPeriodStart("week", now)).toEqual(
      leaderboardPeriodStart("week", now),
    );
    expect(strictHundredPeriodStart("month", now)).toEqual(
      leaderboardPeriodStart("month", now),
    );
  });

  it("uses a rolling 7-day window when stats are all-time", () => {
    const now = new Date(2026, 5, 23, 15, 30, 0);
    expect(strictHundredPeriodStart("all", now)).toEqual(
      new Date(2026, 5, 17, 0, 0, 0, 0),
    );
  });
});

describe("formatStrictHundredPolicy", () => {
  it("mentions the rolling window for all-time stats", () => {
    expect(formatStrictHundredPolicy("all")).toContain("7 days");
    expect(formatStrictHundredPolicy("all")).toContain("all-time");
  });
});

describe("formatPassDuration", () => {
  it("formats sub-minute durations in seconds", () => {
    expect(formatPassDuration(45_000)).toBe("45s");
  });

  it("formats minute durations", () => {
    expect(formatPassDuration(83_000)).toBe("1m 23s");
  });
});

describe("filterQualifiedLeaderboardRows", () => {
  it("keeps only rows with a fastest 100% pass time", () => {
    const mixed: LeaderboardRow[] = [
      {
        studentId: "a",
        name: "Amy",
        levelName: "L1",
        levelOrder: 1,
        passedCount: 1,
        avgAccuracy: 100,
        fastestPassMs: 30_000,
      },
      {
        studentId: "b",
        name: "Ben",
        levelName: "L1",
        levelOrder: 1,
        passedCount: 2,
        avgAccuracy: 85,
        fastestPassMs: null,
      },
    ];
    expect(filterQualifiedLeaderboardRows(mixed).map((r) => r.studentId)).toEqual([
      "a",
    ]);
  });
});

describe("applyStrictHundredPercentRule", () => {
  it("clears fastest pass when any session in scope was below 100%", () => {
    const rows: LeaderboardRow[] = [
      {
        studentId: "perfect",
        name: "Perfect",
        levelName: "L1",
        levelOrder: 1,
        passedCount: 2,
        avgAccuracy: 100,
        fastestPassMs: 40_000,
      },
      {
        studentId: "mixed",
        name: "Mixed",
        levelName: "L1",
        levelOrder: 1,
        passedCount: 2,
        avgAccuracy: 95,
        fastestPassMs: 30_000,
      },
    ];

    const adjusted = applyStrictHundredPercentRule(rows, ["mixed"]);
    expect(adjusted.find((r) => r.studentId === "perfect")?.fastestPassMs).toBe(
      40_000,
    );
    expect(adjusted.find((r) => r.studentId === "mixed")?.fastestPassMs).toBeNull();
  });
});

describe("rankLeaderboardRows", () => {
  it("ranks students with a 100% pass before those without", () => {
    const rows: LeaderboardRow[] = [
      {
        studentId: "slow",
        name: "Slow",
        levelName: "L1",
        levelOrder: 1,
        passedCount: 5,
        avgAccuracy: 95,
        fastestPassMs: null,
      },
      {
        studentId: "fast",
        name: "Fast",
        levelName: "L1",
        levelOrder: 1,
        passedCount: 1,
        avgAccuracy: 100,
        fastestPassMs: 60_000,
      },
    ];
    expect(rankLeaderboardRows(rows).map((r) => r.studentId)).toEqual([
      "fast",
      "slow",
    ]);
  });

  it("ranks by fastest 100% pass time ascending", () => {
    const rows: LeaderboardRow[] = [
      {
        studentId: "a",
        name: "Amy",
        levelName: "L2",
        levelOrder: 2,
        passedCount: 3,
        avgAccuracy: 100,
        fastestPassMs: 90_000,
      },
      {
        studentId: "b",
        name: "Ben",
        levelName: "L1",
        levelOrder: 1,
        passedCount: 10,
        avgAccuracy: 80,
        fastestPassMs: 45_000,
      },
      {
        studentId: "c",
        name: "Cal",
        levelName: "L3",
        levelOrder: 3,
        passedCount: 1,
        avgAccuracy: 100,
        fastestPassMs: 45_000,
      },
    ];
    const ranked = rankLeaderboardRows(rows);
    expect(ranked.map((r) => r.studentId)).toEqual(["b", "c", "a"]);
    expect(ranked.map((r) => r.rank)).toEqual([1, 2, 3]);
  });

  it("uses passed count and accuracy as tiebreakers when time is equal or missing", () => {
    const rows: LeaderboardRow[] = [
      {
        studentId: "a",
        name: "Zara",
        levelName: null,
        levelOrder: null,
        passedCount: 2,
        avgAccuracy: 80,
        fastestPassMs: null,
      },
      {
        studentId: "b",
        name: "Ben",
        levelName: null,
        levelOrder: null,
        passedCount: 5,
        avgAccuracy: 70,
        fastestPassMs: null,
      },
    ];
    expect(rankLeaderboardRows(rows).map((r) => r.studentId)).toEqual([
      "b",
      "a",
    ]);
  });

  it("breaks ties on name alphabetically at the same perfect-pass time", () => {
    const tied: LeaderboardRow[] = [
      {
        studentId: "1",
        name: "Zed",
        levelName: "L1",
        levelOrder: 1,
        passedCount: 1,
        avgAccuracy: 100,
        fastestPassMs: 30_000,
      },
      {
        studentId: "2",
        name: "Amy",
        levelName: "L1",
        levelOrder: 1,
        passedCount: 1,
        avgAccuracy: 100,
        fastestPassMs: 30_000,
      },
    ];
    expect(rankLeaderboardRows(tied).map((r) => r.name)).toEqual(["Amy", "Zed"]);
  });
});
