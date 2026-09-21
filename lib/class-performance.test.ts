import { describe, expect, it } from "vitest";

import {
  buildClassPerformanceRanking,
  classPerformancePeriodStart,
  parseClassDate,
  percentage,
  todayInDhaka,
} from "@/lib/class-performance";

describe("class performance helpers", () => {
  it("accepts real date keys and rejects invalid calendar dates", () => {
    expect(parseClassDate("2026-09-20")?.toISOString()).toBe(
      "2026-09-20T00:00:00.000Z",
    );
    expect(parseClassDate("2026-02-30")).toBeNull();
    expect(parseClassDate("20-09-2026")).toBeNull();
  });

  it("uses the Bangladesh calendar date", () => {
    expect(todayInDhaka(new Date("2026-09-20T19:00:00.000Z"))).toBe(
      "2026-09-21",
    );
  });

  it("calculates decimal percentages", () => {
    expect(percentage(8.5, 10)).toBe(85);
    expect(percentage(2, 3)).toBe(66.67);
  });

  it("builds a weighted ranking and counts absence as zero", () => {
    const rows = buildClassPerformanceRanking(
      [
        { id: "rafi", name: "Rafi" },
        { id: "sakib", name: "Sakib" },
      ],
      [
        {
          maximumMark: 10,
          entries: [
            { studentId: "rafi", mark: 9, status: "PRESENT" },
            { studentId: "sakib", mark: 0, status: "ABSENT" },
          ],
        },
        {
          maximumMark: 100,
          entries: [
            { studentId: "rafi", mark: 76, status: "PRESENT" },
            { studentId: "sakib", mark: 87, status: "PRESENT" },
          ],
        },
      ],
    );

    expect(rows[1]).toMatchObject({
      studentId: "rafi",
      totalMark: 85,
      totalMaximumMark: 110,
      percentage: 77.27,
      absentCount: 0,
    });
    expect(rows[0]).toMatchObject({
      studentId: "sakib",
      percentage: 79.09,
      absentCount: 1,
    });
    expect(rows[0]?.rank).toBe(1);
  });

  it("starts a 30-day window inclusively", () => {
    expect(
      classPerformancePeriodStart("30", new Date("2026-09-21T06:00:00Z"))
        ?.toISOString()
        .slice(0, 10),
    ).toBe("2026-08-23");
  });
});
