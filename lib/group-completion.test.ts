import { describe, expect, it } from "vitest";

import { buildGroupCompletionRows } from "@/lib/group-completion";

describe("buildGroupCompletionRows", () => {
  it("computes student and attempt completion rates per group", () => {
    expect(
      buildGroupCompletionRows(
        [
          { id: "g1", name: "Group A", studentCount: 2 },
          { id: "g2", name: "Group B", studentCount: 1 },
        ],
        [
          { studentId: "s1", groupId: "g1", passed: true, accuracy: 100 },
          { studentId: "s1", groupId: "g1", passed: false, accuracy: 70 },
          { studentId: "s2", groupId: "g1", passed: false, accuracy: 80 },
          { studentId: "s3", groupId: "g2", passed: true, accuracy: 100 },
        ],
      ),
    ).toEqual([
      {
        groupId: "g1",
        groupName: "Group A",
        studentCount: 2,
        activeStudents: 2,
        studentsPassed: 1,
        studentCompletionRate: 50,
        sessions: 3,
        passed: 1,
        attemptCompletionRate: 33,
        avgAccuracy: 83,
      },
      {
        groupId: "g2",
        groupName: "Group B",
        studentCount: 1,
        activeStudents: 1,
        studentsPassed: 1,
        studentCompletionRate: 100,
        sessions: 1,
        passed: 1,
        attemptCompletionRate: 100,
        avgAccuracy: 100,
      },
    ]);
  });
});
