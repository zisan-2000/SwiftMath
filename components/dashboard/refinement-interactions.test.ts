// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminPracticeInsights } from "./admin-practice-insights";
import { TeachingFocus } from "./teaching-focus";
import { WeeklyPracticeBeads } from "./learning-journey";
import { buildStudentBadges } from "@/lib/student-gamification";

describe("role-specific refinement interactions", () => {
  let root: Root, container: HTMLDivElement;
  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.restoreAllMocks();
  });
  async function click(text: string) {
    const button = [...container.querySelectorAll("button")].find(
      (el) => el.textContent === text,
    )!;
    expect(button).toBeTruthy();
    await act(async () => button.click());
  }
  const days = [
    { date: "2026-11-11", label: "Wed", sessions: 4, passed: 3 },
    { date: "2026-11-12", label: "Thu", sessions: 0, passed: 0 },
  ];
  const practice = {
    daily: days,
    totalSessions: 4,
    passedSessions: 3,
    passRate: 75,
    avgAccuracy: 85,
  };
  it("renders the real area chart at measured dimensions and can change metrics without sizing warnings", async () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      () => ({
        width: 360,
        height: 256,
        top: 0,
        left: 0,
        right: 360,
        bottom: 256,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    );
    const warn = vi.spyOn(console, "warn");
    await act(async () =>
      root.render(
        createElement(AdminPracticeInsights, {
          practice,
          canViewReports: true,
        }),
      ),
    );
    expect(
      container
        .querySelector("div.recharts-wrapper > svg.recharts-surface")
        ?.getAttribute("width"),
    ).toBe("360");
    expect(container.querySelectorAll(".recharts-area")).toHaveLength(2);
    await click("Pass rate");
    expect(container.querySelectorAll(".recharts-area")).toHaveLength(1);
    expect(warn).not.toHaveBeenCalled();
  });
  it("lets an admin inspect an actual zero-attempt day and reset to the full week", async () => {
    await act(async () =>
      root.render(
        createElement(AdminPracticeInsights, {
          practice,
          canViewReports: false,
        }),
      ),
    );
    expect(container.querySelector(".outcome-value")?.textContent).toBe("75%");
    const day = container.querySelector<HTMLButtonElement>(
      '[aria-label="Thu, 2026-11-12: 0 finished sessions"]',
    )!;
    await act(async () => day.click());
    expect(day.getAttribute("aria-pressed")).toBe("true");
    expect(container.querySelector(".outcome-value")?.textContent).toBe("—");
    expect(container.querySelector('a[href="/admin/reports"]')).toBeNull();
    await click("Reset to full week");
    expect(container.querySelector(".outcome-value")?.textContent).toBe("75%");
  });
  it("switches chart metrics without a request or changing source data", async () => {
    await act(async () =>
      root.render(
        createElement(AdminPracticeInsights, {
          practice,
          canViewReports: true,
        }),
      ),
    );
    await click("Pass rate");
    expect(
      [...container.querySelectorAll("button")]
        .find((el) => el.textContent === "Pass rate")
        ?.getAttribute("aria-pressed"),
    ).toBe("true");
    expect(
      container.querySelector('[role="img"]')?.getAttribute("aria-label"),
    ).toContain("days without attempts have no percentage");
    expect(practice.totalSessions).toBe(4);
  });
  const base = {
    studentCount: 10,
    activeStudents: 5,
    studentsPassed: 3,
    sessions: 8,
    passed: 4,
    studentCompletionRate: 30,
    attemptCompletionRate: 50,
    avgAccuracy: 70,
  };
  const groups = [
    { id: "a", name: "Group A" },
    { id: "b", name: "Group B" },
  ];
  it("keeps group actions aligned with the selected authorized group", async () => {
    await act(async () =>
      root.render(
        createElement(TeachingFocus, {
          groups,
          rows: groups.map((group) => ({
            ...base,
            groupId: group.id,
            groupName: group.name,
          })),
          canManageHomework: true,
          canScheduleExams: true,
          canManagePerformance: true,
        }),
      ),
    );
    await act(async () => {
      const select = container.querySelector("select")!;
      select.value = "b";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(
      container.querySelector('a[href="/teacher/groups/b/performance"]'),
    ).toBeTruthy();
    expect(
      container.querySelector('a[href="/teacher/groups/b/homework"]'),
    ).toBeTruthy();
    expect(
      container.querySelector('a[href="/teacher/groups/b/exams"]'),
    ).toBeTruthy();
    expect(
      container.querySelector('a[href="/teacher/groups/a/analytics"]'),
    ).toBeNull();
    expect(container.querySelectorAll(".attention-group")).toHaveLength(1);
  });
  it("hides unauthorized tools and shows good-standing groups only when requested", async () => {
    await act(async () =>
      root.render(
        createElement(TeachingFocus, {
          groups,
          rows: [
            {
              ...base,
              studentCount: 3,
              activeStudents: 3,
              studentsPassed: 3,
              groupId: "a",
              groupName: "Group A",
              studentCompletionRate: 100,
            },
          ],
          canManageHomework: false,
          canScheduleExams: false,
          canManagePerformance: false,
        }),
      ),
    );
    expect(container.querySelectorAll(".attention-group")).toHaveLength(0);
    expect(container.textContent).toContain("No practice gaps");
    await click("All groups");
    expect(container.querySelectorAll(".attention-group")).toHaveLength(1);
    expect(container.querySelector('a[href="/teacher/homework"]')).toBeNull();
    expect(container.textContent).not.toContain("Record class marks");
  });
  it("renders student beads from distinct days and attempt counts without fake completions", async () => {
    const stats = {
      streakDays: 1,
      sessionsLast7Days: 1,
      passedCount: 3,
      leveledUpCount: 0,
      hasPerfectScore: false,
    };
    await act(async () =>
      root.render(
        createElement(WeeklyPracticeBeads, {
          stats: {
            ...stats,
            badges: buildStudentBadges(stats),
            earnedBadgeCount: 1,
          },
          days,
        }),
      ),
    );
    expect(container.querySelectorAll('[data-filled="true"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-filled="false"]')).toHaveLength(4);
    expect(container.querySelectorAll('[data-active="true"]')).toHaveLength(1);
    expect(
      container
        .querySelector('[role="progressbar"]')
        ?.getAttribute("aria-valuenow"),
    ).toBe("20");
  });
});
