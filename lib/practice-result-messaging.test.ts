import { describe, expect, it } from "vitest";

import {
  getPracticeResultMessaging,
  shouldShowPracticeHomeRetryHint,
} from "@/lib/practice-result-messaging";

describe("getPracticeResultMessaging", () => {
  const base = {
    passAccuracy: 80,
    accuracy: 65,
    levelName: "Level 2",
    leveledUp: false,
    expired: false,
    isReview: false,
    passed: false,
  };

  it("uses try again copy for a failed timed attempt", () => {
    const msg = getPracticeResultMessaging({ ...base, passed: false });
    expect(msg.primaryActionLabel).toBe("Try again");
    expect(msg.showRetryPrompt).toBe(true);
    expect(msg.body).toContain("stay on Level 2");
    expect(msg.body).toContain("65%");
    expect(msg.body).toContain("80%");
  });

  it("explains time expiry on failed expired sessions", () => {
    const msg = getPracticeResultMessaging({
      ...base,
      expired: true,
      passed: false,
    });
    expect(msg.headline).toBe("Time ran out");
    expect(msg.primaryActionLabel).toBe("Try again");
    expect(msg.showRetryPrompt).toBe(true);
  });

  it("uses practice again for a pass without level-up", () => {
    const msg = getPracticeResultMessaging({
      ...base,
      passed: true,
      accuracy: 90,
    });
    expect(msg.headline).toBe("You passed!");
    expect(msg.primaryActionLabel).toBe("Practice again");
    expect(msg.showRetryPrompt).toBe(false);
  });

  it("skips retry prompt for review mode", () => {
    const msg = getPracticeResultMessaging({
      ...base,
      isReview: true,
      passed: false,
    });
    expect(msg.primaryActionLabel).toBe("Review again");
    expect(msg.showRetryPrompt).toBe(false);
  });
});

describe("shouldShowPracticeHomeRetryHint", () => {
  it("is true after a failed attempt at the current level", () => {
    expect(
      shouldShowPracticeHomeRetryHint({
        hasLevel: true,
        currentLevelId: "lvl-1",
        lastSession: {
          passed: false,
          mode: "STANDARD",
          status: "COMPLETED",
          levelId: "lvl-1",
        },
      }),
    ).toBe(true);
  });

  it("is false after a pass or review attempt", () => {
    expect(
      shouldShowPracticeHomeRetryHint({
        hasLevel: true,
        currentLevelId: "lvl-1",
        lastSession: {
          passed: true,
          mode: "STANDARD",
          status: "COMPLETED",
          levelId: "lvl-1",
        },
      }),
    ).toBe(false);
  });
});
