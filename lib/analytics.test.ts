import { describe, expect, it } from "vitest";

import {
  buildDailySessionCounts,
  computeAverageAccuracy,
  computePassRate,
} from "@/lib/analytics";

describe("buildDailySessionCounts", () => {
  // Local Date parts so the test is timezone-independent.
  const now = new Date(2026, 5, 22, 15, 0, 0);

  it("fills seven days with zeros when there is no data", () => {
    const result = buildDailySessionCounts([], 7, now);
    expect(result).toHaveLength(7);
    expect(result.every((d) => d.sessions === 0 && d.passed === 0)).toBe(true);
  });

  it("counts sessions on the correct calendar day", () => {
    const rows = [
      { createdAt: new Date(2026, 5, 22, 10, 0, 0), passed: true },
      { createdAt: new Date(2026, 5, 22, 14, 0, 0), passed: false },
      { createdAt: new Date(2026, 5, 21, 9, 0, 0), passed: true },
    ];
    const result = buildDailySessionCounts(rows, 7, now);
    const today = result.find((d) => d.date === "2026-06-22");
    const yesterday = result.find((d) => d.date === "2026-06-21");
    expect(today?.sessions).toBe(2);
    expect(today?.passed).toBe(1);
    expect(yesterday?.sessions).toBe(1);
    expect(yesterday?.passed).toBe(1);
  });
});

describe("computePassRate", () => {
  it("returns rounded percentage", () => {
    expect(computePassRate(7, 10)).toBe(70);
    expect(computePassRate(0, 0)).toBe(0);
  });
});

describe("computeAverageAccuracy", () => {
  it("returns rounded mean", () => {
    expect(computeAverageAccuracy([80, 90])).toBe(85);
    expect(computeAverageAccuracy([])).toBe(0);
  });
});
