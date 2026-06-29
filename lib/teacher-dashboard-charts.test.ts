import { describe, expect, it } from "vitest";

import {
  buildDailyProgressTrend,
  buildGroupComparisonPoints,
} from "@/lib/teacher-dashboard-charts";

describe("buildDailyProgressTrend", () => {
  it("fills pass rate per day", () => {
    const now = new Date("2026-06-23T12:00:00Z");
    const trend = buildDailyProgressTrend(
      [
        {
          createdAt: new Date("2026-06-23T10:00:00Z"),
          passed: true,
          accuracy: 100,
        },
        {
          createdAt: new Date("2026-06-23T11:00:00Z"),
          passed: false,
          accuracy: 80,
        },
      ],
      1,
      now,
    );

    expect(trend).toHaveLength(1);
    expect(trend[0]?.passRate).toBe(50);
    expect(trend[0]?.avgAccuracy).toBe(90);
  });
});

describe("buildGroupComparisonPoints", () => {
  it("compares groups by sessions and pass rate", () => {
    expect(
      buildGroupComparisonPoints(
        [
          { id: "g1", name: "A" },
          { id: "g2", name: "B" },
        ],
        [
          {
            groupId: "g1",
            passed: true,
            accuracy: 100,
            createdAt: new Date(),
          },
          {
            groupId: "g2",
            passed: false,
            accuracy: 70,
            createdAt: new Date(),
          },
        ],
      ),
    ).toEqual([
      { groupId: "g1", groupName: "A", sessions: 1, passRate: 100 },
      { groupId: "g2", groupName: "B", sessions: 1, passRate: 0 },
    ]);
  });
});
