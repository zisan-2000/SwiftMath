import { describe, expect, it } from "vitest";

import {
  filterStudentsByName,
  matchesStudentName,
  matchesStudentSearch,
  normalizeStudentSearch,
} from "@/lib/student-search";

const STUDENTS = [
  { id: "1", name: "Sakib", contactNumber: "01712345678" },
  { id: "2", name: "Rakib", contactNumber: "01812345678" },
  { id: "3", name: "Sarkar" },
  { id: "4", name: "Saklain" },
];

describe("student name search", () => {
  it("matches names case-insensitively as the user types", () => {
    expect(filterStudentsByName(STUDENTS, "SA").map((row) => row.name)).toEqual([
      "Sakib",
      "Sarkar",
      "Saklain",
    ]);
    expect(filterStudentsByName(STUDENTS, "sak").map((row) => row.name)).toEqual([
      "Sakib",
      "Saklain",
    ]);
  });

  it("trims and normalizes the query", () => {
    expect(normalizeStudentSearch("  Sak  ")).toBe("sak");
    expect(matchesStudentName("Sakib", " KIB ")).toBe(true);
  });

  it("matches contact numbers while ignoring query separators", () => {
    expect(filterStudentsByName(STUDENTS, "01712-345").map((row) => row.name)).toEqual([
      "Sakib",
    ]);
    expect(
      matchesStudentSearch({ name: "Sakib", contactNumber: null }, "017"),
    ).toBe(false);
  });

  it("returns the original list for an empty query", () => {
    expect(filterStudentsByName(STUDENTS, "  ")).toBe(STUDENTS);
  });
});
