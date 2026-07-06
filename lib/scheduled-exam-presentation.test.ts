import { describe, expect, it } from "vitest";

import {
  examDisplayTitle,
  examStatusLabel,
  formatExamWindow,
  resolveExamWindowStatus,
} from "@/lib/scheduled-exam-presentation";

describe("scheduled-exam-presentation", () => {
  it("formats exam window", () => {
    const opens = new Date("2026-07-01T10:00:00");
    const closes = new Date("2026-07-01T11:00:00");
    expect(formatExamWindow(opens, closes)).toContain("→");
  });

  it("resolves upcoming status", () => {
    const opens = new Date("2099-01-01T10:00:00");
    const closes = new Date("2099-01-01T11:00:00");
    expect(resolveExamWindowStatus(opens, closes)).toBe("upcoming");
    expect(examStatusLabel("upcoming")).toBe("Upcoming");
  });

  it("falls back display title to level name", () => {
    expect(
      examDisplayTitle({
        id: "1",
        title: "  ",
        opensAt: new Date(),
        closesAt: new Date(),
        level: { name: "Addition I" },
        attemptCount: 0,
        paperQuestionCount: 10,
      }),
    ).toBe("Addition I");
  });
});
