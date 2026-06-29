import { describe, expect, it } from "vitest";

import {
  buildLevelSpeedRows,
  buildSpeedSummary,
  sessionDurationMs,
} from "@/lib/practice-speed";

describe("sessionDurationMs", () => {
  it("returns elapsed time when submitted", () => {
    const startedAt = new Date("2026-01-01T10:00:00Z");
    const submittedAt = new Date("2026-01-01T10:01:30Z");
    expect(
      sessionDurationMs({ startedAt, submittedAt, passed: true }),
    ).toBe(90_000);
  });

  it("returns null without a submit time", () => {
    expect(
      sessionDurationMs({
        startedAt: new Date(),
        submittedAt: null,
        passed: false,
      }),
    ).toBeNull();
  });
});

describe("buildSpeedSummary", () => {
  it("computes averages and fastest pass", () => {
    expect(
      buildSpeedSummary([
        {
          startedAt: new Date("2026-01-01T10:00:00Z"),
          submittedAt: new Date("2026-01-01T10:02:00Z"),
          passed: true,
        },
        {
          startedAt: new Date("2026-01-01T11:00:00Z"),
          submittedAt: new Date("2026-01-01T11:01:00Z"),
          passed: true,
        },
        {
          startedAt: new Date("2026-01-01T12:00:00Z"),
          submittedAt: new Date("2026-01-01T12:03:00Z"),
          passed: false,
        },
      ]),
    ).toEqual({
      timedCount: 3,
      passedCount: 2,
      avgFinishMs: 120_000,
      avgPassMs: 90_000,
      fastestPassMs: 60_000,
    });
  });
});

describe("buildLevelSpeedRows", () => {
  it("groups sessions by level", () => {
    expect(
      buildLevelSpeedRows([
        {
          levelId: "l2",
          levelName: "Level 2",
          orderIndex: 2,
          startedAt: new Date("2026-01-01T10:00:00Z"),
          submittedAt: new Date("2026-01-01T10:01:00Z"),
          passed: true,
        },
        {
          levelId: "l1",
          levelName: "Level 1",
          orderIndex: 1,
          startedAt: new Date("2026-01-01T09:00:00Z"),
          submittedAt: new Date("2026-01-01T09:02:00Z"),
          passed: true,
        },
      ]),
    ).toEqual([
      {
        levelId: "l1",
        levelName: "Level 1",
        orderIndex: 1,
        attemptCount: 1,
        passCount: 1,
        avgPassMs: 120_000,
        fastestPassMs: 120_000,
      },
      {
        levelId: "l2",
        levelName: "Level 2",
        orderIndex: 2,
        attemptCount: 1,
        passCount: 1,
        avgPassMs: 60_000,
        fastestPassMs: 60_000,
      },
    ]);
  });
});
