import { describe, expect, it } from "vitest";

import {
  parseDatetimeLocalField,
  parseScheduleExamForm,
  toDatetimeLocalValue,
} from "@/lib/scheduled-exam-form";

describe("parseDatetimeLocalField", () => {
  it("parses datetime-local strings as local time", () => {
    const parsed = parseDatetimeLocalField("2026-06-23T14:30");
    expect(parsed).not.toBeNull();
    expect(parsed!.getFullYear()).toBe(2026);
    expect(parsed!.getMonth()).toBe(5);
    expect(parsed!.getDate()).toBe(23);
    expect(parsed!.getHours()).toBe(14);
    expect(parsed!.getMinutes()).toBe(30);
  });

  it("returns null for invalid input", () => {
    expect(parseDatetimeLocalField("")).toBeNull();
    expect(parseDatetimeLocalField("not-a-date")).toBeNull();
  });
});

describe("toDatetimeLocalValue", () => {
  it("round-trips with parseDatetimeLocalField", () => {
    const original = new Date(2026, 5, 23, 9, 15, 0, 0);
    const raw = toDatetimeLocalValue(original);
    const parsed = parseDatetimeLocalField(raw);
    expect(parsed?.getTime()).toBe(original.getTime());
  });
});

describe("parseScheduleExamForm", () => {
  it("accepts a valid schedule", () => {
    const result = parseScheduleExamForm({
      title: " Weekly test ",
      levelId: "lvl-1",
      opensAtRaw: "2026-06-23T10:00",
      closesAtRaw: "2026-06-23T11:00",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.title).toBe("Weekly test");
      expect(result.data.levelId).toBe("lvl-1");
    }
  });

  it("rejects when close is before open", () => {
    const result = parseScheduleExamForm({
      levelId: "lvl-1",
      opensAtRaw: "2026-06-23T11:00",
      closesAtRaw: "2026-06-23T10:00",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("after");
    }
  });
});
