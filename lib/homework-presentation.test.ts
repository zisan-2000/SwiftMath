import { describe, expect, it } from "vitest";

import { Role } from "@/lib/generated/prisma/enums";
import {
  buildHomeworkPageSuggestions,
  canAccessHomeworkPhoto,
  elapsedSecondsSince,
  formatElapsedTime,
} from "@/lib/homework-presentation";

describe("homework presentation", () => {
  it("keeps typed page values while producing unique searchable suggestions", () => {
    expect(buildHomeworkPageSuggestions(["77", " 12 ", "77", "A-2", "a-2", ""])).toEqual([
      "12",
      "77",
      "A-2",
    ]);
  });

  it("reconstructs and formats elapsed time from the persisted start", () => {
    expect(elapsedSecondsSince("2026-10-06T10:00:00Z", new Date("2026-10-06T10:08:35Z"))).toBe(515);
    expect(formatElapsedTime(515)).toBe("08:35");
    expect(formatElapsedTime(3_661)).toBe("01:01:01");
  });

  it("uses the original schedule creator for teacher photo authorization", () => {
    const base = { studentId: "student-a", scheduleCreatorId: "teacher-old" };
    expect(canAccessHomeworkPhoto({ ...base, role: Role.TEACHER, userId: "teacher-old" })).toBe(true);
    expect(canAccessHomeworkPhoto({ ...base, role: Role.TEACHER, userId: "teacher-new" })).toBe(false);
    expect(canAccessHomeworkPhoto({ ...base, role: Role.STUDENT, userId: "student-a" })).toBe(true);
    expect(canAccessHomeworkPhoto({ ...base, role: Role.STUDENT, userId: "student-b" })).toBe(false);
    expect(canAccessHomeworkPhoto({ ...base, role: Role.ADMIN, userId: "admin" })).toBe(true);
  });
});
