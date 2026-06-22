import { describe, expect, it } from "vitest";

import { DEFAULT_STARTER_LEVELS } from "@/lib/default-levels";

describe("DEFAULT_STARTER_LEVELS", () => {
  it("provides five ordered levels for a new institute", () => {
    expect(DEFAULT_STARTER_LEVELS).toHaveLength(5);

    const orderIndexes = DEFAULT_STARTER_LEVELS.map((l) => l.orderIndex);
    expect(orderIndexes).toEqual([1, 2, 3, 4, 5]);
  });

  it("keeps every level within valid practice bounds", () => {
    for (const level of DEFAULT_STARTER_LEVELS) {
      expect(level.name.length).toBeGreaterThan(0);
      expect(level.termsPerQuestion).toBeGreaterThanOrEqual(2);
      expect(level.minNumber).toBeLessThanOrEqual(level.maxNumber);
      expect(level.questionCount).toBeGreaterThan(0);
      expect(level.timeLimitSeconds).toBeGreaterThan(0);
      expect(level.passAccuracy).toBeGreaterThanOrEqual(0);
      expect(level.passAccuracy).toBeLessThanOrEqual(100);
    }
  });
});
