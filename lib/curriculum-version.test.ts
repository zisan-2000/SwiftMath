import { describe, expect, it } from "vitest";

import {
  formatCurriculumVersionLabel,
  nextCurriculumVersionNumber,
} from "@/lib/curriculum-version";

describe("nextCurriculumVersionNumber", () => {
  it("starts at 1 when no versions exist", () => {
    expect(nextCurriculumVersionNumber(null)).toBe(1);
    expect(nextCurriculumVersionNumber(undefined)).toBe(1);
  });

  it("increments from the current max", () => {
    expect(nextCurriculumVersionNumber(3)).toBe(4);
  });
});

describe("formatCurriculumVersionLabel", () => {
  it("includes optional admin note", () => {
    expect(
      formatCurriculumVersionLabel({
        versionNumber: 2,
        label: "Term 2",
      }),
    ).toBe("Version 2 — Term 2");
  });

  it("omits blank labels", () => {
    expect(formatCurriculumVersionLabel({ versionNumber: 1 })).toBe("Version 1");
  });
});
