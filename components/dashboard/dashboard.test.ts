import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminDashboard, type AdminDashboardProps } from "./admin-dashboard";
import {
  TeacherDashboard,
  type TeacherDashboardProps,
} from "./teacher-dashboard";
import {
  StudentDashboard,
  type StudentDashboardProps,
} from "./student-dashboard";
import { buildStudentBadges } from "@/lib/student-gamification";

const practice = {
  daily: [{ date: "2026-11-12", label: "Thu", sessions: 4, passed: 3 }],
  totalSessions: 4,
  passedSessions: 3,
  passRate: 75,
  avgAccuracy: 85,
};
const stats = {
  streakDays: 2,
  sessionsLast7Days: 3,
  passedCount: 3,
  leveledUpCount: 0,
  hasPerfectScore: false,
};
const admin: AdminDashboardProps = {
  instituteName: "Test institute",
  teachers: 2,
  students: 10,
  groups: 3,
  levels: 4,
  academicLevels: 2,
  practice,
  onboarding: null,
  activity: [],
  canViewReports: true,
};
const teacher: TeacherDashboardProps = {
  teacherName: "Test Teacher",
  groups: [{ id: "group-a", name: "Group A" }],
  studentCount: 10,
  canManageHomework: true,
  canScheduleExams: true,
  canManagePerformance: true,
  analytics: {
    practice,
    speed: {
      avgPassMs: 72000,
      avgFinishMs: 74000,
      fastestPassMs: 60000,
      passedCount: 3,
      timedCount: 4,
    },
    dailyProgress: [],
    groupComparison: [],
    groupCompletion: [
      {
        groupId: "group-a",
        groupName: "Group A",
        studentCount: 10,
        activeStudents: 4,
        studentsPassed: 3,
        studentCompletionRate: 30,
        sessions: 4,
        passed: 3,
        attemptCompletionRate: 75,
        avgAccuracy: 85,
      },
    ],
  },
};
const student: StudentDashboardProps = {
  studentName: "Test Student",
  academicLevel: "Academic Level 1",
  currentLevel: "Addition II",
  groupName: "Group A",
  practice,
  gamification: {
    ...stats,
    badges: buildStudentBadges(stats),
    earnedBadgeCount: 1,
  },
  rank: { rank: null, totalQualified: 0 },
  classPerformance: {
    rows: [],
    classCount: 0,
    absentCount: 0,
    overallPercentage: 0,
  },
  nextAction: createElement(
    "a",
    { href: "/student/practice" },
    "Continue learning",
  ),
};

afterEach(() => vi.restoreAllMocks());
describe("role dashboard presentation from actual service-shaped data", () => {
  it("shows the admin's actual enrollment, curriculum and seven-day analytics", () => {
    const html = renderToString(createElement(AdminDashboard, admin));
    expect(html).toContain("Test institute");
    expect(html).toContain("75%");
    expect(html).toContain("Active academic levels");
    expect(html).toContain("Practice sub-levels");
    expect(html).toContain('href="/admin/teachers"');
    expect(html).not.toContain("+12%");
  });
  it("does not fabricate percentages or trends for an institute with no practice", () => {
    const html = renderToString(
      createElement(AdminDashboard, {
        ...admin,
        practice: {
          ...practice,
          daily: [],
          totalSessions: 0,
          passedSessions: 0,
          passRate: 0,
          avgAccuracy: 0,
        },
      }),
    );
    expect(html).toContain("No practice sessions yet");
    expect(html).toContain("Invite your students");
    expect(html).not.toContain("75%");
  });
  it("does not render denied admin analytics, reports or activity", () => {
    const html = renderToString(
      createElement(AdminDashboard, {
        ...admin,
        practice: null,
        activity: null,
        canViewReports: false,
      }),
    );
    expect(html).not.toContain('href="/admin/reports"');
    expect(html).not.toContain("Recent activity");
    expect(html).not.toContain("Practice, at a glance");
  });
  it("renders audit events as text and preserves their timestamp", () => {
    const html = renderToString(
      createElement(AdminDashboard, {
        ...admin,
        activity: [
          {
            id: "event",
            summary: "<script>not executable</script>",
            actorName: "Teacher",
            createdAt: "2026-11-12T08:00:00.000Z",
          },
        ],
      }),
    );
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain('dateTime="2026-11-12T08:00:00.000Z"');
  });
  it("derives teaching priorities from actual inactive students and keeps group-scoped destinations", () => {
    const html = renderToString(createElement(TeacherDashboard, teacher));
    expect(html).toContain("Reconnect with");
    expect(html).toContain("6");
    expect(html).toContain('href="/teacher/groups/group-a/analytics"');
    expect(html).toContain("75%");
    expect(html).toContain("1m 12s");
  });
  it("does not show actionable features denied to a teacher", () => {
    const html = renderToString(
      createElement(TeacherDashboard, {
        ...teacher,
        analytics: null,
        canManageHomework: false,
        canScheduleExams: false,
        canManagePerformance: false,
      }),
    );
    expect(html).not.toContain('href="/teacher/homework"');
    expect(html).not.toContain('href="/teacher/exams"');
    expect(html).not.toContain("Practice performance");
    expect(html).not.toContain("75%");
    expect(html).toContain('href="/teacher/groups/group-a"');
  });
  it("explains that group assignment is admin-controlled in the empty teacher state", () => {
    const html = renderToString(
      createElement(TeacherDashboard, {
        ...teacher,
        groups: [],
        analytics: null,
        studentCount: 0,
      }),
    );
    expect(html).toContain("An institute admin can assign groups");
    expect(html).not.toContain("Everyone has taken a step");
  });
  it("shows earned and locked student achievements using actual counts", () => {
    const html = renderToString(createElement(StudentDashboard, student));
    expect(html).toContain("1 of 5 earned");
    expect(html).toContain("First pass");
    expect(html).toContain("Not earned yet");
    expect(html).toContain('aria-label="Weekly warrior: 3 of 5"');
    expect(html).toContain("60%");
  });
  it("keeps an unassigned student and unqualified rank honest, without a fake learning stage", () => {
    const html = renderToString(
      createElement(StudentDashboard, {
        ...student,
        academicLevel: null,
        currentLevel: null,
        groupName: null,
      }),
    );
    expect(html).toContain("Not assigned");
    expect(html).toContain("No sub-level assigned yet");
    expect(html).toContain("Not ranked yet");
    expect(html).not.toContain("#1");
    expect(html).toContain(
      "Academic level changes are always set by your teacher",
    );
  });
  it("preserves every class record, decimal marks and absent status in expandable history", () => {
    const rows = Array.from({ length: 6 }, (_, index) => ({
      date: `2026-11-0${index + 1}`,
      label: `Class ${index + 1}`,
      groupName: "Group A",
      mark: index === 1 ? "0" : "8.5",
      maximumMark: "10",
      percentage: index === 1 ? 0 : 85,
      status: index === 1 ? ("ABSENT" as const) : ("PRESENT" as const),
    }));
    const html = renderToString(
      createElement(StudentDashboard, {
        ...student,
        classPerformance: {
          rows,
          classCount: 6,
          absentCount: 1,
          overallPercentage: 70.83,
        },
      }),
    );
    expect(html).toContain("Class 6");
    expect(html).toContain("View all");
    expect(html).toContain("8.5");
    expect(html).toContain("Absent · counted as zero");
    expect(html).toContain("70.83%");
  });
  it("preserves the server-provided next action instead of inventing a start/resume URL", () => {
    const html = renderToString(
      createElement(StudentDashboard, {
        ...student,
        nextAction: createElement(
          "a",
          { href: "/student/practice/active-session" },
          "Resume exam",
        ),
      }),
    );
    expect(html).toContain('href="/student/practice/active-session"');
    expect(html).toContain("Resume exam");
  });
  it("renders every nonempty dashboard on the server without Recharts sizing warnings", () => {
    const warn = vi.spyOn(console, "warn");
    renderToString(createElement(AdminDashboard, admin));
    renderToString(createElement(TeacherDashboard, teacher));
    renderToString(createElement(StudentDashboard, student));
    expect(warn).not.toHaveBeenCalled();
  });
});
