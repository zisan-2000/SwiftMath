import { describe, expect, it } from "vitest";

import {
  buildInstituteThemeVariables,
  normalizeHexColor,
  primaryForeground,
  validatePrimaryColor,
} from "@/lib/institute-theme";

describe("normalizeHexColor", () => {
  it("accepts hash and bare hex", () => {
    expect(normalizeHexColor("#4f46e5")).toBe("#4F46E5");
    expect(normalizeHexColor("4F46E5")).toBe("#4F46E5");
  });

  it("rejects invalid values", () => {
    expect(normalizeHexColor("red")).toBeNull();
    expect(normalizeHexColor("#12345")).toBeNull();
  });
});

describe("validatePrimaryColor", () => {
  it("allows empty for platform default", () => {
    expect(validatePrimaryColor("")).toBeNull();
  });

  it("rejects invalid hex", () => {
    expect(validatePrimaryColor("not-a-color")).toBe(
      "Primary color must be a hex value like #4F46E5.",
    );
  });
});

describe("buildInstituteThemeVariables", () => {
  it("returns CSS variables for a valid color", () => {
    const vars = buildInstituteThemeVariables("#DC2626");
    expect(vars?.["--primary"]).toBe("#DC2626");
    expect(vars?.["--primary-foreground"]).toBeTruthy();
    expect(vars?.["--sidebar-primary"]).toBe("#DC2626");
  });

  it("returns null when no custom color is set", () => {
    expect(buildInstituteThemeVariables(null)).toBeNull();
    expect(buildInstituteThemeVariables("")).toBeNull();
  });
});

describe("primaryForeground", () => {
  it("uses dark text on light primaries", () => {
    expect(primaryForeground("#FACC15")).toBe("#0A0A0A");
  });

  it("uses light text on dark primaries", () => {
    expect(primaryForeground("#DC2626")).toBe("#FAFAFA");
  });
});
