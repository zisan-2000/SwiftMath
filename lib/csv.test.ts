import { describe, expect, it } from "vitest";

import { escapeCsvCell, rowsToCsv, slugifyFilename } from "@/lib/csv";

describe("escapeCsvCell", () => {
  it("leaves simple values unquoted", () => {
    expect(escapeCsvCell("Alice")).toBe("Alice");
    expect(escapeCsvCell(42)).toBe("42");
  });

  it("quotes values with commas or quotes", () => {
    expect(escapeCsvCell('Say "hi"')).toBe('"Say ""hi"""');
    expect(escapeCsvCell("Group A, Morning")).toBe('"Group A, Morning"');
  });

  it("treats null as empty", () => {
    expect(escapeCsvCell(null)).toBe("");
  });
});

describe("rowsToCsv", () => {
  it("builds a header row and UTF-8 BOM", () => {
    const csv = rowsToCsv(["Name"], [["Alice"]]);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("Name");
    expect(csv).toContain("Alice");
  });
});

describe("slugifyFilename", () => {
  it("lowercases and replaces unsafe characters", () => {
    expect(slugifyFilename("SEFT Institute")).toBe("seft-institute");
  });
});
