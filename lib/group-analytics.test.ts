import { describe, expect, it } from "vitest";

import { buildGroupStudentSummaries } from "@/lib/group-analytics";

describe("buildGroupStudentSummaries", () => {
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
      },
      {
        studentId: "s2",
        name: "Bilal",
        sessions: 0,
        passed: 0,
        passRate: 0,
        avgAccuracy: 0,
        retries: 0,
      },
    ]);
  });

  it("aggregates attempts per student", () => {
    expect(
      buildGroupStudentSummaries(
        [{ id: "s1", name: "Aisha" }],
        [
          { studentId: "s1", passed: true, accuracy: 100 },
          { studentId: "s1", passed: false, accuracy: 80 },
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
      },
    ]);
  });
});
