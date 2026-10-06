import { describe, expect, it } from "vitest";

import {
  buildWeeklyOccurrenceWindows,
  dhakaDateTime,
  homeworkTiming,
  parseDhakaLocalDateTime,
  parseDateOnly,
  parseTimeToMinute,
} from "@/lib/homework-schedule";

describe("homework schedule", () => {
  it("converts Bangladesh-local date and time to UTC", () => {
    expect(dhakaDateTime(parseDateOnly("2026-10-09")!, 18 * 60).toISOString()).toBe(
      "2026-10-09T12:00:00.000Z",
    );
  });

  it("builds only selected weekly dates", () => {
    const windows = buildWeeklyOccurrenceWindows({
      startDate: parseDateOnly("2026-10-01")!,
      fromDate: parseDateOnly("2026-10-01")!,
      throughDate: parseDateOnly("2026-10-10")!,
      slots: [
        { dayOfWeek: 5, openMinute: 18 * 60, dueMinute: 23 * 60 },
        { dayOfWeek: 6, openMinute: 18 * 60, dueMinute: 23 * 60 },
      ],
    });
    expect(windows.map((item) => item.opensAt.toISOString())).toEqual([
      "2026-10-02T12:00:00.000Z",
      "2026-10-03T12:00:00.000Z",
      "2026-10-09T12:00:00.000Z",
      "2026-10-10T12:00:00.000Z",
    ]);
  });

  it("separates late and overtime flags", () => {
    expect(
      homeworkTiming(
        new Date("2026-10-09T12:00:00Z"),
        new Date("2026-10-09T12:45:00Z"),
        new Date("2026-10-09T13:00:00Z"),
        30,
      ),
    ).toEqual({
      completionSeconds: 2700,
      isLate: false,
      lateBySeconds: 0,
      isOverTimeLimit: true,
      overtimeSeconds: 900,
    });
  });

  it("validates date and time fields", () => {
    expect(parseDateOnly("2026-02-30")).toBeNull();
    expect(parseTimeToMinute("23:59")).toBe(1439);
    expect(parseTimeToMinute("24:00")).toBeNull();
    expect(parseDhakaLocalDateTime("2026-10-09T18:00")?.toISOString()).toBe(
      "2026-10-09T12:00:00.000Z",
    );
  });
});
