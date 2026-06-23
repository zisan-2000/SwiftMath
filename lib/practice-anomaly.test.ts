import { describe, expect, it } from "vitest";

import {
  AnomalyFlag,
  collectAnomalyFlags,
  detectFastSubmit,
  detectHighTabBlur,
  sanitizeTabBlurCount,
} from "@/lib/practice-anomaly";

describe("detectFastSubmit", () => {
  it("flags when elapsed time is below one second per question", () => {
    const start = 1_000_000;
    expect(detectFastSubmit(start, start + 5_000, 10)).toBe(true);
    expect(detectFastSubmit(start, start + 10_000, 10)).toBe(false);
  });

  it("ignores empty question sets", () => {
    expect(detectFastSubmit(0, 1000, 0)).toBe(false);
  });
});

describe("detectHighTabBlur", () => {
  it("flags at the default threshold", () => {
    expect(detectHighTabBlur(4)).toBe(false);
    expect(detectHighTabBlur(5)).toBe(true);
  });
});

describe("sanitizeTabBlurCount", () => {
  it("clamps invalid and excessive values", () => {
    expect(sanitizeTabBlurCount(undefined)).toBe(0);
    expect(sanitizeTabBlurCount(-3)).toBe(0);
    expect(sanitizeTabBlurCount(999)).toBe(100);
    expect(sanitizeTabBlurCount(3.9)).toBe(3);
  });
});

describe("collectAnomalyFlags", () => {
  it("combines fast submit and tab blur for timed sessions", () => {
    const flags = collectAnomalyFlags({
      startedAtMs: 0,
      submittedAtMs: 2_000,
      questionCount: 10,
      checkFastSubmit: true,
      tabBlurCount: 6,
    });
    expect(flags).toEqual([
      AnomalyFlag.FAST_SUBMIT,
      AnomalyFlag.HIGH_TAB_BLUR,
    ]);
  });

  it("skips fast submit when not checking timed standard", () => {
    const flags = collectAnomalyFlags({
      startedAtMs: 0,
      submittedAtMs: 500,
      questionCount: 10,
      checkFastSubmit: false,
      tabBlurCount: 0,
    });
    expect(flags).toEqual([]);
  });
});
