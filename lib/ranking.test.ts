import { describe, expect, it } from "vitest";

import {
  leaderboardPeriodStart,
  parseLeaderboardPeriod,
  rankLeaderboardRows,
  type LeaderboardRow,
} from "@/lib/ranking";

const rows: LeaderboardRow[] = [
  {
    studentId: "a",
    name: "Zara",
    levelName: "L1",
    levelOrder: 1,
    passedCount: 2,
    avgAccuracy: 80,
  },
  {
    studentId: "b",
    name: "Ben",
    levelName: "L2",
    levelOrder: 2,
    passedCount: 1,
    avgAccuracy: 90,
  },
  {
    studentId: "c",
    name: "Amy",
    levelName: "L2",
    levelOrder: 2,
    passedCount: 3,
    avgAccuracy: 70,
  },
  {
    studentId: "d",
    name: "No Level",
    levelName: null,
    levelOrder: null,
    passedCount: 10,
    avgAccuracy: 100,
  },
];

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

describe("rankLeaderboardRows", () => {
  it("sorts by level, then passes, then accuracy, then name", () => {
    const ranked = rankLeaderboardRows(rows);
    expect(ranked.map((r) => r.studentId)).toEqual(["c", "b", "a", "d"]);
    expect(ranked.map((r) => r.rank)).toEqual([1, 2, 3, 4]);
  });

  it("breaks ties on name alphabetically at the same level and stats", () => {
    const tied: LeaderboardRow[] = [
      {
        studentId: "1",
        name: "Zed",
        levelName: "L1",
        levelOrder: 1,
        passedCount: 1,
        avgAccuracy: 80,
      },
      {
        studentId: "2",
        name: "Amy",
        levelName: "L1",
        levelOrder: 1,
        passedCount: 1,
        avgAccuracy: 80,
      },
    ];
    expect(rankLeaderboardRows(tied).map((r) => r.name)).toEqual(["Amy", "Zed"]);
  });
});
