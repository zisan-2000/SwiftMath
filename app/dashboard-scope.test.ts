import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminDashboardPage from "./admin/page";
import TeacherDashboardPage from "./teacher/page";

const mocks = vi.hoisted(() => ({
  userCount: vi.fn(),
  groupCount: vi.fn(),
  groupList: vi.fn(),
  levels: vi.fn(),
  academics: vi.fn(),
  sessions: vi.fn(),
  activity: vi.fn(),
  analytics: vi.fn(),
  teacherAnalytics: vi.fn(),
  can: vi.fn(),
  sync: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { count: mocks.userCount },
    group: { count: mocks.groupCount, findMany: mocks.groupList },
    level: { count: mocks.levels },
    academicLevel: { count: mocks.academics },
    practiceSession: { count: mocks.sessions },
    auditLog: { findMany: mocks.activity },
  },
}));
vi.mock("@/server/admin-page", () => ({
  loadAdminPageContext: async () => ({
    admin: {
      id: "admin-a",
      instituteId: "institute-a",
      name: "Admin",
      role: "ADMIN",
    },
    institute: null,
  }),
}));
vi.mock("@/server/teacher-page", () => ({
  loadTeacherPageContext: async () => ({
    teacher: {
      id: "teacher-a",
      instituteId: "institute-a",
      name: "Teacher",
      role: "TEACHER",
    },
    institute: null,
  }),
}));
vi.mock("@/server/permissions", () => ({ can: mocks.can }));
vi.mock("@/server/analytics", () => ({
  getInstitutePracticeAnalytics: mocks.analytics,
  getTeacherDashboardAnalytics: mocks.teacherAnalytics,
}));
vi.mock("@/server/notifications", () => ({
  syncTeacherExamClosedNotifications: mocks.sync,
}));
vi.mock("@/components/admin/admin-page-shell", () => ({
  AdminPageShell: () => null,
}));
vi.mock("@/components/teacher/teacher-page-shell", () => ({
  TeacherPageShell: () => null,
}));
vi.mock("@/components/pwa/install-app-button", () => ({
  InstallAppButton: () => null,
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.can.mockResolvedValue(true);
  mocks.userCount.mockResolvedValue(2);
  mocks.groupCount.mockResolvedValue(1);
  mocks.groupList.mockResolvedValue([{ id: "group-a", name: "A" }]);
  mocks.levels.mockResolvedValue(2);
  mocks.academics.mockResolvedValue(1);
  mocks.sessions.mockResolvedValue(3);
  mocks.activity.mockResolvedValue([]);
  mocks.analytics.mockResolvedValue(null);
  mocks.teacherAnalytics.mockResolvedValue(null);
});
describe("dashboard data scope and capability boundaries", () => {
  it("scopes new academic-level and activity reads to the authenticated institute", async () => {
    await AdminDashboardPage();
    expect(mocks.academics).toHaveBeenCalledWith({
      where: { instituteId: "institute-a", isActive: true },
    });
    expect(mocks.activity).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { instituteId: "institute-a" },
        take: 4,
      }),
    );
    expect(mocks.analytics).toHaveBeenCalledWith("institute-a");
  });
  it("does not query practice analytics or the activity timeline when denied", async () => {
    mocks.can.mockResolvedValue(false);
    await AdminDashboardPage();
    expect(mocks.activity).not.toHaveBeenCalled();
    expect(mocks.analytics).not.toHaveBeenCalled();
    expect(mocks.sessions).not.toHaveBeenCalled();
  });
  it("loads teacher groups through assignments, never the legacy ownership pointer", async () => {
    await TeacherDashboardPage();
    const query = mocks.groupList.mock.calls[0][0];
    expect(query.where).toMatchObject({
      instituteId: "institute-a",
      teacherAssignments: {
        some: { teacherId: "teacher-a", instituteId: "institute-a" },
      },
    });
    expect(query.where).not.toHaveProperty("teacherId");
    expect(mocks.userCount.mock.calls[0][0].where).toMatchObject({
      role: "STUDENT",
      instituteId: "institute-a",
      group: query.where,
    });
  });
  it("keeps denied teacher analytics out of the dashboard's data fetch", async () => {
    mocks.can.mockResolvedValue(false);
    await TeacherDashboardPage();
    expect(mocks.teacherAnalytics).not.toHaveBeenCalled();
    expect(mocks.groupList).toHaveBeenCalledOnce();
    expect(mocks.sync).toHaveBeenCalledWith("teacher-a", "institute-a");
  });
});
