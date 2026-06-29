import { describe, expect, it } from "vitest";

import {
  parseGroupTimeLimitField,
  resolveTimeLimitSeconds,
  validateGroupTimeLimitSeconds,
} from "@/lib/group-level-time";

describe("resolveTimeLimitSeconds", () => {
  it("uses the group override when present", () => {
    expect(resolveTimeLimitSeconds(120, 180)).toBe(180);
  });

  it("falls back to the level default", () => {
    expect(resolveTimeLimitSeconds(120, null)).toBe(120);
    expect(resolveTimeLimitSeconds(120, undefined)).toBe(120);
  });
});

describe("validateGroupTimeLimitSeconds", () => {
  it("accepts values in range", () => {
    expect(validateGroupTimeLimitSeconds(60)).toBeNull();
  });

  it("rejects invalid values", () => {
    expect(validateGroupTimeLimitSeconds(0)).toBe(
      "Time limit must be at least 1 second.",
    );
    expect(validateGroupTimeLimitSeconds(3601)).toBe(
      "Time limit must be 3600 seconds (1 hour) or less.",
    );
  });
});

describe("parseGroupTimeLimitField", () => {
  it("returns null for blank input", () => {
    expect(parseGroupTimeLimitField("")).toBeNull();
  });

  it("parses integer seconds", () => {
    expect(parseGroupTimeLimitField("90")).toBe(90);
  });
});
