import { describe, expect, it } from "vitest";

import {
  auditActivityHref,
  formatAuditActionLabel,
  parseAuditActionFilter,
  truncateAuditPrompt,
} from "@/lib/audit-log";
import { AuditAction } from "@/lib/generated/prisma/enums";

describe("truncateAuditPrompt", () => {
  it("leaves short prompts unchanged", () => {
    expect(truncateAuditPrompt("3 + 4")).toBe("3 + 4");
  });

  it("truncates long prompts", () => {
    const long = "1 + 2 + 3 + 4 + 5 + 6 + 7 + 8 + 9 + 10 + 11 + 12";
    expect(truncateAuditPrompt(long, 20)).toMatch(/…$/);
    expect(truncateAuditPrompt(long, 20).length).toBeLessThanOrEqual(20);
  });
});

describe("formatAuditActionLabel", () => {
  it("returns readable labels", () => {
    expect(formatAuditActionLabel(AuditAction.GROUP_QUESTION_DISABLED)).toBe(
      "Disabled (group)",
    );
    expect(formatAuditActionLabel(AuditAction.CURRICULUM_VERSION_BUMPED)).toBe(
      "Curriculum bump",
    );
  });
});

describe("parseAuditActionFilter", () => {
  it("accepts known actions", () => {
    expect(parseAuditActionFilter("QUESTION_PUBLISHED")).toBe(
      AuditAction.QUESTION_PUBLISHED,
    );
  });

  it("rejects unknown values", () => {
    expect(parseAuditActionFilter(undefined)).toBeNull();
    expect(parseAuditActionFilter("NOT_REAL")).toBeNull();
  });
});

describe("auditActivityHref", () => {
  it("builds page and action query params", () => {
    expect(
      auditActivityHref("/admin/activity", 2, AuditAction.QUESTIONS_IMPORTED),
    ).toBe("/admin/activity?page=2&action=QUESTIONS_IMPORTED");
    expect(auditActivityHref("/admin/activity", 1, null)).toBe(
      "/admin/activity",
    );
  });
});
