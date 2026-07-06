import { describe, expect, it } from "vitest";

import { getActiveTeacherGroupTab } from "@/lib/teacher-group-nav";

describe("getActiveTeacherGroupTab", () => {
  const groupId = "grp_1";

  it("returns overview for the group root", () => {
    expect(getActiveTeacherGroupTab(`/teacher/groups/${groupId}`, groupId)).toBe(
      "overview",
    );
  });

  it("returns students for the students tab", () => {
    expect(
      getActiveTeacherGroupTab(
        `/teacher/groups/${groupId}/students`,
        groupId,
      ),
    ).toBe("students");
  });

  it("returns students for a nested student page", () => {
    expect(
      getActiveTeacherGroupTab(
        `/teacher/groups/${groupId}/students/stu_1`,
        groupId,
      ),
    ).toBe("students");
  });

  it("returns exams for the exams tab", () => {
    expect(
      getActiveTeacherGroupTab(`/teacher/groups/${groupId}/exams`, groupId),
    ).toBe("exams");
  });
});
