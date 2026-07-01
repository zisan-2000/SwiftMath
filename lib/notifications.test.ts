import { describe, expect, it } from "vitest";

import {
  buildBankOnlyBlockedNotification,
  buildBankPartialWarningNotification,
  buildExamOpenNotification,
  buildExamScheduledNotification,
  buildLevelAssignedNotification,
  buildLevelUpNotification,
  buildStudentJoinedGroupNotification,
  formatNotificationTypeLabel,
  notificationDedupeKeys,
  notificationsListHref,
  notificationsPageHref,
  roleHasNotificationInbox,
} from "@/lib/notifications";
import { NotificationType, Role } from "@/lib/generated/prisma/enums";

describe("notificationsPageHref", () => {
  it("returns inbox paths for student, teacher, and admin", () => {
    expect(notificationsPageHref(Role.STUDENT)).toBe("/student/notifications");
    expect(notificationsPageHref(Role.TEACHER)).toBe("/teacher/notifications");
    expect(notificationsPageHref(Role.ADMIN)).toBe("/admin/notifications");
    expect(notificationsPageHref(Role.SUPER_ADMIN)).toBeNull();
  });
});

describe("roleHasNotificationInbox", () => {
  it("matches roles with an inbox", () => {
    expect(roleHasNotificationInbox(Role.STUDENT)).toBe(true);
    expect(roleHasNotificationInbox(Role.TEACHER)).toBe(true);
    expect(roleHasNotificationInbox(Role.ADMIN)).toBe(true);
    expect(roleHasNotificationInbox(Role.SUPER_ADMIN)).toBe(false);
  });
});

describe("notificationDedupeKeys", () => {
  it("builds stable keys", () => {
    expect(notificationDedupeKeys.examOpen("exam-1")).toBe("EXAM_OPEN:exam-1");
    expect(notificationDedupeKeys.levelAssigned("stu-1", "lvl-1")).toBe(
      "LEVEL_ASSIGNED:stu-1:lvl-1",
    );
    expect(notificationDedupeKeys.studentJoinedGroup("grp-1", "stu-1")).toBe(
      "STUDENT_JOINED:grp-1:stu-1",
    );
    expect(notificationDedupeKeys.bankPartial("lvl-1")).toBe("BANK_PARTIAL:lvl-1");
  });
});

describe("formatNotificationTypeLabel", () => {
  it("returns readable labels", () => {
    expect(formatNotificationTypeLabel(NotificationType.EXAM_SCHEDULED)).toBe(
      "Exam scheduled",
    );
    expect(formatNotificationTypeLabel(NotificationType.EXAM_OPEN)).toBe(
      "Exam open",
    );
    expect(formatNotificationTypeLabel(NotificationType.LEVEL_ASSIGNED)).toBe(
      "Level set",
    );
    expect(formatNotificationTypeLabel(NotificationType.STUDENT_JOINED_GROUP)).toBe(
      "New student",
    );
    expect(formatNotificationTypeLabel(NotificationType.BANK_PARTIAL_WARNING)).toBe(
      "Bank partial",
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
});

describe("buildExamOpenNotification", () => {
  it("links to the student home page", () => {
    const content = buildExamOpenNotification({
      examTitle: "Weekly test",
      levelName: "Level 3",
      closesAt: new Date("2026-06-01T10:00:00Z"),
    });

    expect(content.title).toBe("Exam is open");
    expect(content.body).toContain("Weekly test");
    expect(content.body).toContain("open now");
    expect(content.href).toBe("/student");
  });
});

describe("buildLevelAssignedNotification", () => {
  it("includes the assigned level name", () => {
    const content = buildLevelAssignedNotification({ levelName: "Addition II" });
    expect(content.body).toContain("Addition II");
    expect(content.href).toBe("/student/practice");
  });
});

describe("buildStudentJoinedGroupNotification", () => {
  it("links to the teacher group page", () => {
    const content = buildStudentJoinedGroupNotification({
      studentName: "Aisha",
      groupName: "Class A",
      groupId: "grp-1",
    });

    expect(content.body).toContain("Aisha");
    expect(content.href).toBe("/teacher/groups/grp-1");
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

    expect(content.href).toBe("/admin/levels/lvl-1");
  });
});

describe("buildBankPartialWarningNotification", () => {
  it("links to the level question bank page", () => {
    const content = buildBankPartialWarningNotification({
      levelId: "lvl-1",
      levelName: "Addition II",
      detail: "Hybrid sessions will fill the gap.",
    });

    expect(content.title).toBe("Question bank partial");
    expect(content.href).toBe("/admin/levels/lvl-1/questions");
  });
});

describe("notificationsListHref", () => {
  it("adds page query for page 2+", () => {
    expect(notificationsListHref(Role.TEACHER, 2)).toBe(
      "/teacher/notifications?page=2",
    );
  });
});
