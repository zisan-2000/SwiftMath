import { describe, expect, it } from "vitest";

import {
  filterStudentsByName,
  matchesStudentName,
  normalizeStudentSearch,
} from "@/lib/student-search";

const STUDENTS = [
  { id: "1", name: "Sakib" },
  { id: "2", name: "Rakib" },
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

  it("returns the original list for an empty query", () => {
    expect(filterStudentsByName(STUDENTS, "  ")).toBe(STUDENTS);
  });
});
