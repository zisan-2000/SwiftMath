import { describe, expect, it } from "vitest";

import {
  buildGroupStudentSummaries,
  buildGroupSpeedSummary,
  type GroupStudentSessionRow,
} from "@/lib/group-analytics";

describe("buildGroupStudentSummaries", () => {
  const timed = (
    studentId: string,
    passed: boolean,
    accuracy: number,
    minutes: number,
  ): GroupStudentSessionRow => ({
    studentId,
    passed,
    accuracy,
    startedAt: new Date("2026-01-01T10:00:00Z"),
    submittedAt: new Date(
      new Date("2026-01-01T10:00:00Z").getTime() + minutes * 60_000,
    ),
  });

  it("includes every student with zero stats when there are no sessions", () => {
    expect(
      buildGroupStudentSummaries(
        [
          { id: "s1", name: "Aisha" },
          { id: "s2", name: "Bilal" },
        ],
        [],
      ),
    ).toEqual([
      {
        studentId: "s1",
        name: "Aisha",
        sessions: 0,
        passed: 0,
        passRate: 0,
        avgAccuracy: 0,
        retries: 0,
        avgPassMs: null,
        fastestPassMs: null,
      },
      {
        studentId: "s2",
        name: "Bilal",
        sessions: 0,
        passed: 0,
        passRate: 0,
        avgAccuracy: 0,
        retries: 0,
        avgPassMs: null,
        fastestPassMs: null,
      },
    ]);
  });

  it("aggregates attempts and speed per student", () => {
    expect(
      buildGroupStudentSummaries(
        [{ id: "s1", name: "Aisha" }],
        [
          timed("s1", true, 100, 2),
          timed("s1", false, 80, 3),
        ],
      ),
    ).toEqual([
      {
        studentId: "s1",
        name: "Aisha",
        sessions: 2,
        passed: 1,
        passRate: 50,
        avgAccuracy: 90,
        retries: 1,
        avgPassMs: 120_000,
        fastestPassMs: 120_000,
      },
    ]);
  });
});

describe("buildGroupSpeedSummary", () => {
  it("aggregates speed across all group sessions", () => {
    expect(
      buildGroupSpeedSummary([
        {
          startedAt: new Date("2026-01-01T10:00:00Z"),
          submittedAt: new Date("2026-01-01T10:01:00Z"),
          passed: true,
        },
      ]).fastestPassMs,
    ).toBe(60_000);
  });
});
