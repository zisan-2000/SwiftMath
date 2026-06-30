import { describe, expect, it } from "vitest";

import {
  buildLevelQuestionImportTemplate,
  parseCsvLine,
  parseLevelQuestionImportCsv,
} from "@/lib/level-question-csv";

describe("parseCsvLine", () => {
  it("parses quoted commas", () => {
    expect(parseCsvLine('"12 + 7, extra",19')).toEqual(["12 + 7, extra", "19"]);
  });

  it("parses escaped quotes", () => {
    expect(parseCsvLine('"Say ""hi""",5')).toEqual(['Say "hi"', "5"]);
  });
});

describe("parseLevelQuestionImportCsv", () => {
  it("parses header + rows", () => {
    const csv = `prompt,correctAnswer,category,difficulty
12 + 7,19,Addition,EASY
9 + 4,13,,MEDIUM`;

    const result = parseLevelQuestionImportCsv(csv);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0]?.prompt).toBe("12 + 7");
      expect(result.rows[1]?.category).toBeNull();
    }
  });

  it("returns row errors for invalid answers", () => {
    const result = parseLevelQuestionImportCsv("bad,2.5,,EASY");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.rowErrors?.[0]).toContain("Row 1");
    }
  });
});

describe("buildLevelQuestionImportTemplate", () => {
  it("includes header and example rows", () => {
    const csv = buildLevelQuestionImportTemplate();
    expect(csv).toContain("prompt");
    expect(csv).toContain("12 + 7");
  });
});
