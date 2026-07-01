import { describe, expect, it } from "vitest";

import {
  buildBankOnlyBlockedNotification,
  buildExamScheduledNotification,
  buildLevelUpNotification,
  formatNotificationTypeLabel,
  notificationsListHref,
  notificationsPageHref,
  roleHasNotificationInbox,
} from "@/lib/notifications";
import { NotificationType, Role } from "@/lib/generated/prisma/enums";

describe("notificationsPageHref", () => {
  it("returns inbox paths for student and admin", () => {
    expect(notificationsPageHref(Role.STUDENT)).toBe("/student/notifications");
    expect(notificationsPageHref(Role.ADMIN)).toBe("/admin/notifications");
    expect(notificationsPageHref(Role.TEACHER)).toBeNull();
  });
});

describe("roleHasNotificationInbox", () => {
  it("matches roles with an inbox", () => {
    expect(roleHasNotificationInbox(Role.STUDENT)).toBe(true);
    expect(roleHasNotificationInbox(Role.ADMIN)).toBe(true);
    expect(roleHasNotificationInbox(Role.TEACHER)).toBe(false);
  });
});

describe("formatNotificationTypeLabel", () => {
  it("returns readable labels", () => {
    expect(formatNotificationTypeLabel(NotificationType.EXAM_SCHEDULED)).toBe(
      "Exam",
    );
    expect(formatNotificationTypeLabel(NotificationType.LEVEL_UP)).toBe(
      "Level up",
    );
  });
});

describe("buildExamScheduledNotification", () => {
  it("uses title when provided", () => {
    const content = buildExamScheduledNotification({
      examTitle: "Mid-term",
      levelName: "Level 3",
      groupName: "Batch A",
      opensAt: new Date("2026-06-01T09:00:00Z"),
      closesAt: new Date("2026-06-01T10:00:00Z"),
    });

    expect(content.title).toBe("Exam scheduled");
    expect(content.body).toContain("Mid-term");
    expect(content.body).toContain("Batch A");
    expect(content.href).toBe("/student");
  });

  it("falls back to level name without a custom title", () => {
    const content = buildExamScheduledNotification({
      examTitle: null,
      levelName: "Level 3",
      groupName: "Batch A",
      opensAt: new Date("2026-06-01T09:00:00Z"),
      closesAt: new Date("2026-06-01T10:00:00Z"),
    });

    expect(content.body.startsWith("Level 3")).toBe(true);
  });
});

describe("buildLevelUpNotification", () => {
  it("includes the new level name", () => {
    const content = buildLevelUpNotification({ levelName: "Level 4" });
    expect(content.body).toContain("Level 4");
    expect(content.href).toBe("/student/practice");
  });
});

describe("buildBankOnlyBlockedNotification", () => {
  it("links to the level admin page", () => {
    const content = buildBankOnlyBlockedNotification({
      levelId: "lvl-1",
      levelName: "Level 2",
      detail: "Add 5 more questions.",
    });

    expect(content.title).toBe("Bank-only practice blocked");
    expect(content.body).toContain("Level 2");
    expect(content.href).toBe("/admin/levels/lvl-1");
  });
});

describe("notificationsListHref", () => {
  it("adds page query for page 2+", () => {
    expect(notificationsListHref(Role.STUDENT, 1)).toBe(
      "/student/notifications",
    );
    expect(notificationsListHref(Role.ADMIN, 3)).toBe(
      "/admin/notifications?page=3",
    );
  });
});
