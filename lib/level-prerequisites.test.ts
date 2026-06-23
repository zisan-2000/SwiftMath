import { describe, expect, it } from "vitest";

import {
  canAccessLevel,
  levelUnlockMessage,
  type LevelUnlockCheck,
} from "@/lib/level-prerequisites";

const base: LevelUnlockCheck = {
  orderIndex: 3,
  requiresPreviousPass: true,
  previousLevelName: "Addition II",
  studentPassedPrevious: false,
};

describe("canAccessLevel", () => {
  it("allows level 1 regardless of previous pass", () => {
    expect(
      canAccessLevel({
        ...base,
        orderIndex: 1,
        studentPassedPrevious: false,
      }),
    ).toBe(true);
  });

  it("allows when prerequisite is disabled on the level", () => {
    expect(
      canAccessLevel({
        ...base,
        requiresPreviousPass: false,
        studentPassedPrevious: false,
      }),
    ).toBe(true);
  });

  it("blocks when previous level is required but not passed", () => {
    expect(canAccessLevel(base)).toBe(false);
  });

  it("allows when the previous level was passed", () => {
    expect(
      canAccessLevel({ ...base, studentPassedPrevious: true }),
    ).toBe(true);
  });

  it("allows when there is no previous level in the curriculum", () => {
    expect(
      canAccessLevel({
        ...base,
        orderIndex: 2,
        previousLevelName: null,
        studentPassedPrevious: false,
      }),
    ).toBe(true);
  });
});

describe("levelUnlockMessage", () => {
  it("returns null when access is allowed", () => {
    expect(levelUnlockMessage({ ...base, studentPassedPrevious: true })).toBeNull();
  });

  it("names the previous level when blocked", () => {
    expect(levelUnlockMessage(base)).toBe(
      'Pass “Addition II” before starting this level.',
    );
  });
});
