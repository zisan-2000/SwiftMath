import { describe, expect, it } from "vitest";

import { Role } from "@/lib/generated/prisma/enums";
import { buildNavBadges } from "@/lib/nav-badges";

describe("buildNavBadges", () => {
  it("maps unread count to the notifications link", () => {
    expect(
      buildNavBadges(Role.STUDENT, { unreadCount: 4, hasPendingExam: false }),
    ).toEqual({
      "/student/notifications": 4,
    });
  });

  it("caps unread badges at 99+", () => {
    expect(
      buildNavBadges(Role.TEACHER, { unreadCount: 120 }),
    ).toEqual({
      "/teacher/notifications": "99+",
    });
  });

  it("adds an exam dot on student home", () => {
    expect(
      buildNavBadges(Role.STUDENT, { unreadCount: 0, hasPendingExam: true }),
    ).toEqual({
      "/student": "!",
    });
  });
});
