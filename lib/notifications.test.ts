import { describe, expect, it } from "vitest";

import {
  buildBankOnlyBlockedNotification,
  buildBankPartialWarningNotification,
  buildCurriculumBumpedNotification,
  buildExamCancelledNotification,
  buildExamClosedSummaryNotification,
  buildExamClosingSoonNotification,
  buildExamOpenNotification,
  buildExamScheduledNotification,
  buildGroupBankBlockedNotification,
  buildGroupQuestionDisabledAdminNotification,
  buildLevelAssignedNotification,
  buildLevelUpNotification,
  buildStudentJoinedGroupNotification,
  formatNotificationTypeLabel,
  getNotificationTypePresentation,
  notificationEmptyStateCopy,
  notificationInboxHref,
  notificationDedupeKeys,
  notificationsListHref,
  notificationsPageHref,
  parseNotificationReadFilter,
  parseNotificationTypeFilter,
  roleHasNotificationInbox,
  STUDENT_PENDING_EXAM_HREF,
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
    expect(notificationDedupeKeys.examScheduled("exam-1")).toBe(
      "EXAM_SCHEDULED:exam-1",
    );
    expect(notificationDedupeKeys.examCancelled("exam-1")).toBe(
      "EXAM_CANCELLED:exam-1",
    );
    expect(notificationDedupeKeys.examClosingSoon("exam-1")).toBe(
      "EXAM_CLOSING_SOON:exam-1",
    );
    expect(notificationDedupeKeys.examClosed("exam-1")).toBe("EXAM_CLOSED:exam-1");
    expect(notificationDedupeKeys.levelAssigned("stu-1", "lvl-1")).toBe(
      "LEVEL_ASSIGNED:stu-1:lvl-1",
    );
    expect(notificationDedupeKeys.studentJoinedGroup("grp-1", "stu-1")).toBe(
      "STUDENT_JOINED:grp-1:stu-1",
    );
    expect(notificationDedupeKeys.groupBankBlocked("grp-1", "lvl-1")).toBe(
      "GROUP_BANK_BLOCKED:grp-1:lvl-1",
    );
    expect(notificationDedupeKeys.curriculumBumped("ver-1")).toBe(
      "CURRICULUM_BUMPED:ver-1",
    );
    expect(notificationDedupeKeys.bankPartial("lvl-1")).toBe("BANK_PARTIAL:lvl-1");
    expect(notificationDedupeKeys.bankOnlyBlocked("lvl-1")).toBe(
      "BANK_ONLY_BLOCKED:lvl-1",
    );
    expect(notificationDedupeKeys.levelUp("stu-1", "lvl-1")).toBe(
      "LEVEL_UP:stu-1:lvl-1",
    );
  });
});

describe("formatNotificationTypeLabel", () => {
  it("returns readable labels", () => {
    expect(formatNotificationTypeLabel(NotificationType.EXAM_SCHEDULED)).toBe(
      "Exam scheduled",
    );
    expect(formatNotificationTypeLabel(NotificationType.EXAM_CANCELLED)).toBe(
      "Exam cancelled",
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
    expect(formatNotificationTypeLabel(NotificationType.EXAM_CLOSING_SOON)).toBe(
      "Exam closing",
    );
    expect(formatNotificationTypeLabel(NotificationType.CURRICULUM_BUMPED)).toBe(
      "Curriculum",
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
    expect(content.href).toBe(STUDENT_PENDING_EXAM_HREF);
  });

  it("includes actor attribution when provided", () => {
    const content = buildExamScheduledNotification({
      examTitle: "Mid-term",
      levelName: "Level 3",
      groupName: "Batch A",
      opensAt: new Date("2026-06-01T09:00:00Z"),
      closesAt: new Date("2026-06-01T10:00:00Z"),
      actorName: "Rahim",
    });

    expect(content.body).toContain("Scheduled by Rahim");
  });
});

describe("buildExamCancelledNotification", () => {
  it("explains the exam will not run", () => {
    const content = buildExamCancelledNotification({
      examTitle: "Mid-term",
      levelName: "Level 3",
      groupName: "Batch A",
      actorName: "Rahim",
    });

    expect(content.title).toBe("Exam cancelled");
    expect(content.body).toContain("will not run");
    expect(content.body).toContain("Cancelled by Rahim");
    expect(content.href).toBe(STUDENT_PENDING_EXAM_HREF);
  });
});

describe("buildExamOpenNotification", () => {
  it("links to the pending exam anchor", () => {
    const content = buildExamOpenNotification({
      examTitle: "Weekly test",
      levelName: "Level 3",
      closesAt: new Date("2026-06-01T10:00:00Z"),
    });

    expect(content.title).toBe("Exam is open");
    expect(content.body).toContain("Weekly test");
    expect(content.body).toContain("open now");
    expect(content.href).toBe(STUDENT_PENDING_EXAM_HREF);
  });
});

describe("buildExamClosingSoonNotification", () => {
  it("warns before the exam closes", () => {
    const content = buildExamClosingSoonNotification({
      examTitle: "Weekly test",
      levelName: "Level 3",
      closesAt: new Date("2026-06-01T10:00:00Z"),
    });

    expect(content.title).toBe("Exam closing soon");
    expect(content.body).toContain("Weekly test");
    expect(content.href).toBe(STUDENT_PENDING_EXAM_HREF);
  });
});

describe("buildExamClosedSummaryNotification", () => {
  it("links to group analytics", () => {
    const content = buildExamClosedSummaryNotification({
      examTitle: "Weekly test",
      levelName: "Level 3",
      groupName: "Class A",
      groupId: "grp-1",
      attemptedCount: 18,
      studentCount: 20,
    });

    expect(content.body).toContain("18/20");
    expect(content.href).toBe("/teacher/groups/grp-1/analytics");
  });
});

describe("buildGroupBankBlockedNotification", () => {
  it("links to group question overrides", () => {
    const content = buildGroupBankBlockedNotification({
      groupName: "Class A",
      groupId: "grp-1",
      levelName: "Level 5",
      available: 6,
      required: 10,
    });

    expect(content.body).toContain("6/10");
    expect(content.href).toBe("/teacher/groups/grp-1/questions");
  });
});

describe("buildGroupQuestionDisabledAdminNotification", () => {
  it("links to the admin activity filter", () => {
    const content = buildGroupQuestionDisabledAdminNotification({
      teacherName: "Rahim",
      groupName: "Class A",
      levelName: "Addition II",
      prompt: "3 + 4",
    });

    expect(content.body).toContain("Rahim");
    expect(content.href).toBe("/admin/activity?action=GROUP_QUESTION_DISABLED");
  });
});

describe("buildCurriculumBumpedNotification", () => {
  it("links to admin settings", () => {
    const content = buildCurriculumBumpedNotification({
      versionNumber: 3,
      label: "Term 2",
    });

    expect(content.body).toContain("v3");
    expect(content.body).toContain("Term 2");
    expect(content.href).toBe("/admin/settings");
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

describe("notificationInboxHref", () => {
  it("preserves type and unread filters", () => {
    expect(
      notificationInboxHref(Role.ADMIN, {
        page: 2,
        type: NotificationType.CURRICULUM_BUMPED,
        read: "unread",
      }),
    ).toBe("/admin/notifications?page=2&type=CURRICULUM_BUMPED&read=unread");
  });
});

describe("parseNotificationTypeFilter", () => {
  it("accepts role-specific types only", () => {
    expect(
      parseNotificationTypeFilter(Role.STUDENT, NotificationType.LEVEL_UP),
    ).toBe(NotificationType.LEVEL_UP);
    expect(
      parseNotificationTypeFilter(Role.STUDENT, NotificationType.CURRICULUM_BUMPED),
    ).toBeNull();
  });
});

describe("parseNotificationReadFilter", () => {
  it("defaults to all", () => {
    expect(parseNotificationReadFilter(undefined)).toBe("all");
    expect(parseNotificationReadFilter("unread")).toBe("unread");
  });
});

describe("notificationEmptyStateCopy", () => {
  it("returns filter-specific copy when filtered", () => {
    const empty = notificationEmptyStateCopy(Role.STUDENT, {
      type: NotificationType.EXAM_OPEN,
      read: "all",
    });
    expect(empty.title).toBe("No matching notifications");
  });
});

describe("getNotificationTypePresentation", () => {
  it("maps exam types to exam styling", () => {
    const presentation = getNotificationTypePresentation(
      NotificationType.EXAM_OPEN,
    );
    expect(presentation.icon).toBe("exam");
    expect(presentation.accentClass).toContain("amber");
  });
});
