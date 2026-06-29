import { describe, expect, it } from "vitest";

import {
  getExamWindowStatus,
  isExamWindowOpen,
  validateScheduledExamWindow,
} from "@/lib/exam-window";

describe("isExamWindowOpen", () => {
  const opens = new Date("2026-06-01T10:00:00.000Z");
  const closes = new Date("2026-06-01T11:00:00.000Z");

  it("is true at the boundaries and inside the window", () => {
    expect(isExamWindowOpen(opens.getTime(), opens, closes)).toBe(true);
    expect(isExamWindowOpen(closes.getTime(), opens, closes)).toBe(true);
    expect(
      isExamWindowOpen(new Date("2026-06-01T10:30:00.000Z").getTime(), opens, closes),
    ).toBe(true);
  });

  it("is false before open and after close", () => {
    expect(
      isExamWindowOpen(new Date("2026-06-01T09:59:59.999Z").getTime(), opens, closes),
    ).toBe(false);
    expect(
      isExamWindowOpen(new Date("2026-06-01T11:00:00.001Z").getTime(), opens, closes),
    ).toBe(false);
  });
});

describe("getExamWindowStatus", () => {
  const opens = new Date("2026-06-01T10:00:00.000Z");
  const closes = new Date("2026-06-01T11:00:00.000Z");

  it("returns upcoming, open, or closed", () => {
    expect(
      getExamWindowStatus(new Date("2026-06-01T09:00:00.000Z").getTime(), opens, closes),
    ).toBe("upcoming");
    expect(
      getExamWindowStatus(new Date("2026-06-01T10:30:00.000Z").getTime(), opens, closes),
    ).toBe("open");
    expect(
      getExamWindowStatus(new Date("2026-06-01T12:00:00.000Z").getTime(), opens, closes),
    ).toBe("closed");
  });
});

describe("validateScheduledExamWindow", () => {
  it("accepts a valid window", () => {
    expect(
      validateScheduledExamWindow(
        new Date("2026-06-01T10:00:00.000Z"),
        new Date("2026-06-01T11:00:00.000Z"),
      ),
    ).toBeNull();
  });

  it("rejects when close is not after open", () => {
    const t = new Date("2026-06-01T10:00:00.000Z");
    expect(validateScheduledExamWindow(t, t)).toBe(
      "End time must be after the start time.",
    );
  });
});
