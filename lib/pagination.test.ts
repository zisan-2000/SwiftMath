import { describe, expect, it } from "vitest";

import {
  buildPaginatedList,
  clampPageSize,
  computeTotalPages,
  pageRangeEnd,
  pageRangeStart,
  paginationBounds,
  parsePageParam,
} from "@/lib/pagination";

describe("parsePageParam", () => {
  it("defaults invalid values to 1", () => {
    expect(parsePageParam(undefined)).toBe(1);
    expect(parsePageParam("0")).toBe(1);
    expect(parsePageParam("abc")).toBe(1);
  });

  it("accepts positive integers", () => {
    expect(parsePageParam("3")).toBe(3);
  });
});

describe("paginationBounds", () => {
  it("computes skip/take for page 2", () => {
    expect(paginationBounds(2, 25)).toEqual({
      skip: 25,
      take: 25,
      page: 2,
      pageSize: 25,
    });
  });

  it("clamps oversized page sizes", () => {
    expect(paginationBounds(1, 999).pageSize).toBe(100);
  });
});

describe("computeTotalPages", () => {
  it("returns 1 for empty lists", () => {
    expect(computeTotalPages(0, 25)).toBe(1);
  });

  it("rounds up partial pages", () => {
    expect(computeTotalPages(26, 25)).toBe(2);
  });
});

describe("buildPaginatedList", () => {
  it("packages items with metadata", () => {
    const result = buildPaginatedList(["a", "b"], 30, 2, 25);
    expect(result).toEqual({
      items: ["a", "b"],
      total: 30,
      page: 2,
      pageSize: 25,
      totalPages: 2,
    });
  });
});

describe("page range labels", () => {
  it("describes the visible slice", () => {
    expect(pageRangeStart(2, 25)).toBe(26);
    expect(pageRangeEnd(2, 25, 30)).toBe(30);
  });
});

describe("clampPageSize", () => {
  it("enforces minimum 1 and maximum 100", () => {
    expect(clampPageSize(0)).toBe(1);
    expect(clampPageSize(200)).toBe(100);
  });
});
