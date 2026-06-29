import { describe, expect, it } from "vitest";

import {
  resolveChallengePassAccuracy,
  resolveChallengeTimeLimitSeconds,
} from "@/lib/challenge-mode";

describe("resolveChallengeTimeLimitSeconds", () => {
  it("uses 75% of the standard limit with a 30s floor", () => {
    expect(resolveChallengeTimeLimitSeconds(120)).toBe(90);
    expect(resolveChallengeTimeLimitSeconds(40)).toBe(30);
    expect(resolveChallengeTimeLimitSeconds(20)).toBe(30);
  });
});

describe("resolveChallengePassAccuracy", () => {
  it("adds ten points capped at 100", () => {
    expect(resolveChallengePassAccuracy(80)).toBe(90);
    expect(resolveChallengePassAccuracy(95)).toBe(100);
  });
});
