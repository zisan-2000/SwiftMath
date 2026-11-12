import { isValidElement, type ReactElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import StudentDashboardPage from "./page";

const mocks = vi.hoisted(() => ({
  profile: vi.fn(),
  practice: vi.fn(),
  session: vi.fn(),
  exam: vi.fn(),
  rank: vi.fn(),
  gamification: vi.fn(),
  classes: vi.fn(),
  sync: vi.fn(),
  startExam: vi.fn(),
  startPractice: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique: mocks.profile } },
}));
vi.mock("@/server/student-page", () => ({
  loadStudentPageContext: async () => ({
    student: {
      id: "student-a",
      instituteId: "institute-a",
      name: "Student",
      role: "STUDENT",
    },
    institute: null,
  }),
}));
vi.mock("@/server/analytics", () => ({
  getStudentPracticeAnalytics: mocks.practice,
}));
vi.mock("@/server/practice", () => ({
  getStudentInProgressSession: mocks.session,
}));
vi.mock("@/server/scheduled-exam", () => ({
  getStudentPendingScheduledExam: mocks.exam,
}));
vi.mock("@/server/ranking", () => ({ getStudentInstituteRank: mocks.rank }));
vi.mock("@/server/student-gamification", () => ({
  getStudentGamificationSummary: mocks.gamification,
}));
vi.mock("@/server/class-performance", () => ({
  getOwnClassPerformanceHistory: mocks.classes,
}));
vi.mock("@/server/notifications", () => ({
  syncStudentScheduledExamNotifications: mocks.sync,
}));
vi.mock("@/app/student/actions", () => ({ startExamAction: mocks.startExam }));
vi.mock("@/app/student/practice/actions", () => ({
  startSessionAction: mocks.startPractice,
}));
vi.mock("@/components/student/student-page-shell", () => ({
  StudentPageShell: () => null,
}));
vi.mock("@/components/pwa/install-app-button", () => ({
  InstallAppButton: () => null,
}));

function descendants(node: ReactNode): ReactElement<Record<string, unknown>>[] {
  if (Array.isArray(node)) return node.flatMap(descendants);
  if (!isValidElement<Record<string, unknown>>(node)) return [];
  return [node, ...descendants(node.props.children as ReactNode)];
}
async function nextAction() {
  const page = await StudentDashboardPage({
    searchParams: Promise.resolve({}),
  });
  const view = descendants(page).find((node) => "nextAction" in node.props)!;
  return descendants(view.props.nextAction as ReactNode);
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.profile.mockResolvedValue({
    currentLevel: { name: "Addition I" },
    academicLevel: { name: "Academic I" },
    group: { name: "Group A" },
  });
  mocks.practice.mockResolvedValue({});
  mocks.session.mockResolvedValue(null);
  mocks.exam.mockResolvedValue(null);
  mocks.rank.mockResolvedValue({ rank: null });
  mocks.gamification.mockResolvedValue({});
  mocks.classes.mockResolvedValue({});
});
describe("student dashboard preserves next-action workflow", () => {
  it("posts a fresh practice to the existing server action", async () => {
    const nodes = await nextAction();
    expect(nodes.find((node) => node.type === "form")?.props.action).toBe(
      mocks.startPractice,
    );
    expect(mocks.startPractice).not.toHaveBeenCalled();
  });
  it("resumes the actual in-progress practice instead of starting another", async () => {
    mocks.session.mockResolvedValue({
      id: "active-practice",
      mode: "REVIEW",
      level: { name: "Addition I" },
    });
    const nodes = await nextAction();
    expect(
      nodes.some(
        (node) => node.props.href === "/student/practice/active-practice",
      ),
    ).toBe(true);
    expect(nodes.some((node) => node.type === "form")).toBe(false);
  });
  it("posts the selected scheduled exam ID to the existing exam action", async () => {
    mocks.exam.mockResolvedValue({
      id: "exam-a",
      title: "Assessment",
      level: { name: "Addition I", passAccuracy: 75 },
      closesAt: new Date("2026-11-20"),
      inProgressSessionId: null,
    });
    const nodes = await nextAction();
    expect(nodes.find((node) => node.type === "form")?.props.action).toBe(
      mocks.startExam,
    );
    expect(nodes.find((node) => node.type === "input")?.props.value).toBe(
      "exam-a",
    );
  });
  it("blocks a new exam behind unfinished non-exam practice", async () => {
    mocks.session.mockResolvedValue({
      id: "active-practice",
      mode: "STANDARD",
      level: { name: "Addition I" },
    });
    mocks.exam.mockResolvedValue({
      id: "exam-a",
      level: { name: "Addition I", passAccuracy: 75 },
      closesAt: new Date("2026-11-20"),
    });
    const nodes = await nextAction();
    expect(
      nodes.some(
        (node) => node.props.href === "/student/practice/active-practice",
      ),
    ).toBe(true);
    expect(nodes.some((node) => node.type === "form")).toBe(false);
  });
  it("resumes an existing exam through the original practice-session route", async () => {
    mocks.exam.mockResolvedValue({
      id: "exam-a",
      level: { name: "Addition I", passAccuracy: 75 },
      closesAt: new Date("2026-11-20"),
      inProgressSessionId: "active-exam",
    });
    const nodes = await nextAction();
    expect(
      nodes.some((node) => node.props.href === "/student/practice/active-exam"),
    ).toBe(true);
  });
  it("never offers start practice without an assigned sub-level and retains student-scoped reads", async () => {
    mocks.profile.mockResolvedValue({ currentLevel: null });
    const nodes = await nextAction();
    expect(nodes.some((node) => node.type === "form")).toBe(false);
    expect(mocks.classes).toHaveBeenCalledWith("student-a", "institute-a");
    expect(mocks.rank).toHaveBeenCalledWith("student-a", "institute-a");
    expect(mocks.practice).toHaveBeenCalledWith("student-a");
  });
});
