import { describe, expect, it } from "vitest";

import {
  buildAdminOnboardingSteps,
  isAdminOnboardingComplete,
} from "@/lib/admin-onboarding";

describe("buildAdminOnboardingSteps", () => {
  it("marks all steps incomplete for a brand-new institute", () => {
    const steps = buildAdminOnboardingSteps({
      teachers: 0,
      groups: 0,
      students: 0,
      practiceSessions: 0,
    });
    expect(steps).toHaveLength(4);
    expect(steps.every((s) => !s.done)).toBe(true);
  });

  it("marks steps done as counts increase", () => {
    const steps = buildAdminOnboardingSteps({
      teachers: 1,
      groups: 1,
      students: 3,
      practiceSessions: 0,
    });
    expect(steps.find((s) => s.id === "teachers")?.done).toBe(true);
    expect(steps.find((s) => s.id === "groups")?.done).toBe(true);
    expect(steps.find((s) => s.id === "students")?.done).toBe(true);
    expect(steps.find((s) => s.id === "practice")?.done).toBe(false);
  });
});

describe("isAdminOnboardingComplete", () => {
  it("returns true only when every step is done", () => {
    const steps = buildAdminOnboardingSteps({
      teachers: 1,
      groups: 1,
      students: 1,
      practiceSessions: 2,
    });
    expect(isAdminOnboardingComplete(steps)).toBe(true);
  });
});
