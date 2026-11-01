import { describe, expect, it } from "vitest";
import {
  defaultReportDates,
  homeworkReportStatus,
  parseReportFilters,
  reportPercentage,
  reportFormQuery,
  reportQueryString,
  reportTimestampRange,
  reportToCsv,
  safeReportCsvCell,
  summarizeReport,
  type ReportRow,
} from "@/lib/reports";

const query = {
  scope: "group",
  groupId: "group-a",
  modules: ["class", "homework"],
  from: "2026-10-01",
  to: "2026-10-31",
  view: "both",
};
const row = (
  mark: number | null,
  maximum: number | null,
  overrides: Partial<ReportRow> = {},
): ReportRow => ({
  id: "1",
  studentId: "a",
  student: "Rafi",
  module: "class",
  date: "2026-10-25",
  group: "A",
  label: "Class",
  status: "PRESENT",
  mark,
  maximum,
  ...overrides,
});
describe("report filters and dates", () => {
  it("validates and deduplicates selected sections", () => {
    expect(
      parseReportFilters({ ...query, modules: ["class", "class"] }).modules,
    ).toEqual(["class"]);
  });
  it("rejects unknown sections, invalid/reversed dates and empty target", () => {
    for (const changes of [
      { modules: ["wrong"] },
      { from: "2026-02-30" },
      { from: "2026-11-01" },
      { groupId: "" },
      { scope: "other" },
      { modules: [] },
    ])
      expect(() => parseReportFilters({ ...query, ...changes })).toThrow();
  });
  it("rejects duplicate scalar parameters and unsupported module-specific values", () => {
    for (const changes of [
      { groupId: ["a", "b"] },
      { homeworkStatus: "FAKE" },
      { timing: "sometimes" },
      { practiceMode: "EXAM" },
    ])
      expect(() => parseReportFilters({ ...query, ...changes })).toThrow();
  });
  it("drops a stale group filter in an individual request", () => {
    expect(
      parseReportFilters({ ...query, scope: "student", studentId: "a" })
        .groupId,
    ).toBe("");
  });
  it("includes the final Dhaka day and excludes the next midnight", () => {
    const range = reportTimestampRange(parseReportFilters(query));
    expect(range.gte.toISOString()).toBe("2026-09-30T18:00:00.000Z");
    expect(range.lt.toISOString()).toBe("2026-10-31T18:00:00.000Z");
  });
  it("defaults to the Bangladesh calendar month", () => {
    expect(defaultReportDates(new Date("2026-10-31T19:00:00Z"))).toEqual({
      from: "2026-11-01",
      to: "2026-11-01",
    });
  });
  it("round-trips repeated selected sections through the URL", () => {
    const filters = parseReportFilters(query),
      params = new URLSearchParams(reportQueryString(filters));
    expect(
      parseReportFilters({
        ...Object.fromEntries(params),
        modules: params.getAll("modules"),
      }),
    ).toEqual(filters);
  });
  it("canonicalizes section order and removes irrelevant hidden filters", () => {
    const filters = parseReportFilters({
      ...query,
      modules: ["practice", "class"],
      homeworkStatus: "APPROVED",
      page: "49",
      timing: "late",
    });
    expect(filters.modules).toEqual(["class", "practice"]);
    expect(filters).toMatchObject({ homeworkStatus: "", page: "", timing: "" });
    const form = new FormData();
    form.append("modules", "class");
    form.append("from", "a");
    form.append("from", "b");
    expect(reportFormQuery(form)).toEqual({
      modules: ["class"],
      from: ["a", "b"],
    });
  });
});
describe("report calculations", () => {
  it("uses weighted maximums rather than a mean of percentages", () => {
    const [summary] = summarizeReport([row(9, 10), row(76, 100)]);
    expect(summary.percentage).toBe(77.27);
    expect(summary.totalMark).toBe(85);
  });
  it("keeps decimal sums exact to cents", () => {
    expect(summarizeReport([row(0.1, 1), row(0.2, 1)])[0].totalMark).toBe(0.3);
  });
  it("distinguishes ungraded/no-data from zero scored performance", () => {
    expect(
      summarizeReport([
        row(null, null, { module: "homework", status: "MISSING" }),
      ])[0],
    ).toMatchObject({
      graded: 0,
      totalMaximum: 0,
      percentage: null,
      statuses: { MISSING: 1 },
    });
    expect(
      summarizeReport([row(0, 10, { status: "ABSENT" })])[0].percentage,
    ).toBe(0);
    expect(
      summarizeReport([], [{ id: "a", name: "Rafi" }], ["class"])[0],
    ).toMatchObject({ records: 0, percentage: null });
  });
  it("never mixes module totals", () => {
    expect(
      summarizeReport([row(9, 10), row(80, 100, { module: "homework" })]).map(
        (s) => s.percentage,
      ),
    ).toEqual([90, 80]);
  });
  it("computes derived missing/incomplete states without changing reviewed states", () => {
    const start = new Date("2026-10-01"),
      due = new Date("2026-10-02"),
      now = new Date("2026-10-03");
    expect(homeworkReportStatus(undefined, start, due, now)).toBe("MISSING");
    expect(homeworkReportStatus("IN_PROGRESS", start, due, now)).toBe(
      "INCOMPLETE",
    );
    expect(homeworkReportStatus("APPROVED", start, due, now)).toBe("APPROVED");
    expect(reportPercentage(0, 0)).toBeNull();
  });
});
describe("report CSV", () => {
  it("neutralizes spreadsheet formula injection, preserving ordinary Unicode names", () => {
    for (const value of [
      "=SUM(1)",
      " +cmd",
      "@test",
      "-formula",
      "\tmalicious",
    ])
      expect(safeReportCsvCell(value)).toBe(`'${value}`);
    expect(safeReportCsvCell("রাফি")).toBe("রাফি");
  });
  it("uses selected sections and format, with generation/filter metadata", () => {
    const filters = parseReportFilters({
      ...query,
      view: "summary",
      modules: ["class"],
    });
    const csv = reportToCsv(
      [row(9, 10, { student: "=Rafi" })],
      filters,
      "2026-11-01T00:00:00Z",
    );
    expect(csv).toContain("STUDENT SUMMARY");
    expect(csv).toContain("'=Rafi");
    expect(csv).not.toContain("DATE-WISE DETAILS");
    expect(csv).toContain("2026-10-31");
    expect(csv).toContain("Attendance %");
  });
});
