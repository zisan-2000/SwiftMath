import { describe, expect, it } from "vitest";
import { practiceDaySeries, teachingAttention } from "./dashboard-insights";

describe("dashboard presentation insights", () => {
  it("does not invent a pass rate for a day without finished attempts", () => {
    expect(
      practiceDaySeries([
        { date: "2026-11-12", label: "Thu", sessions: 0, passed: 0 },
      ])[0],
    ).toMatchObject({ passRate: null, notPassed: 0 });
  });
  it("derives daily rates from counts rather than averaging weekly percentages", () => {
    expect(
      practiceDaySeries([
        { date: "2026-11-12", label: "Thu", sessions: 3, passed: 2 },
      ])[0],
    ).toMatchObject({ passRate: 67, notPassed: 1 });
  });
  it("separates inactive learners from active learners without a pass", () => {
    const source = [
      {
        groupId: "a",
        groupName: "A",
        studentCount: 10,
        activeStudents: 7,
        studentsPassed: 4,
        sessions: 20,
        passed: 10,
        studentCompletionRate: 40,
        attemptCompletionRate: 50,
        avgAccuracy: 70,
      },
    ];
    expect(teachingAttention(source)[0]).toMatchObject({
      inactive: 3,
      practisingWithoutPass: 3,
    });
    expect(source[0]).not.toHaveProperty("inactive");
  });
  it("sorts by students without a pass and does not mutate incoming order", () => {
    const base = {
      studentCount: 10,
      activeStudents: 7,
      sessions: 20,
      passed: 10,
      studentCompletionRate: 40,
      attemptCompletionRate: 50,
      avgAccuracy: 70,
    };
    const source = [
      { ...base, groupId: "a", groupName: "A", studentsPassed: 6 },
      { ...base, groupId: "b", groupName: "B", studentsPassed: 2 },
    ];
    expect(teachingAttention(source).map((row) => row.groupId)).toEqual([
      "b",
      "a",
    ]);
    expect(source.map((row) => row.groupId)).toEqual(["a", "b"]);
  });
});
