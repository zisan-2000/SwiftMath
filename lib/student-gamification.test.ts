import { describe, expect, it } from "vitest";

import {
  buildStudentBadges,
  computePracticeStreak,
  countPracticeDaysInWindow,
  practiceDayKeysFromDates,
} from "@/lib/student-gamification";

describe("computePracticeStreak", () => {
  const now = new Date(2026, 5, 23, 12, 0, 0);

  it("returns zero with no practice days", () => {
    expect(computePracticeStreak([], now)).toBe(0);
  });

  it("counts consecutive days ending today", () => {
    const days = practiceDayKeysFromDates([
      new Date(2026, 5, 23, 10, 0, 0),
      new Date(2026, 5, 22, 10, 0, 0),
      new Date(2026, 5, 21, 10, 0, 0),
    ]);
    expect(computePracticeStreak(days, now)).toBe(3);
  });

  it("allows streak to continue from yesterday when today is empty", () => {
    const days = practiceDayKeysFromDates([
      new Date(2026, 5, 22, 10, 0, 0),
      new Date(2026, 5, 21, 10, 0, 0),
    ]);
    expect(computePracticeStreak(days, now)).toBe(2);
  });

  it("breaks when a day is missed", () => {
    const days = practiceDayKeysFromDates([
      new Date(2026, 5, 23, 10, 0, 0),
      new Date(2026, 5, 21, 10, 0, 0),
    ]);
    expect(computePracticeStreak(days, now)).toBe(1);
  });
});

describe("countPracticeDaysInWindow", () => {
  const now = new Date(2026, 5, 23, 12, 0, 0);

  it("counts distinct days in the last seven calendar days", () => {
    const count = countPracticeDaysInWindow(
      [
        new Date(2026, 5, 23, 10, 0, 0),
        new Date(2026, 5, 23, 18, 0, 0),
        new Date(2026, 5, 20, 10, 0, 0),
        new Date(2026, 5, 10, 10, 0, 0),
      ],
      7,
      now,
    );
    expect(count).toBe(2);
  });
});

describe("buildStudentBadges", () => {
  it("marks badges earned from aggregate stats", () => {
    const badges = buildStudentBadges({
      streakDays: 4,
      passedCount: 2,
      leveledUpCount: 1,
      hasPerfectScore: true,
      sessionsLast7Days: 5,
    });

    expect(badges.every((badge) => badge.earned)).toBe(true);
  });

  it("leaves badges unearned for a new student", () => {
    const badges = buildStudentBadges({
      streakDays: 0,
      passedCount: 0,
      leveledUpCount: 0,
      hasPerfectScore: false,
      sessionsLast7Days: 0,
    });

    expect(badges.every((badge) => !badge.earned)).toBe(true);
  });
});
