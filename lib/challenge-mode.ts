// Challenge mode rules — harder timed drill with no level-up.
//
// Challenge uses a shorter timer and a higher pass bar than standard practice.
// Kept pure so the server engine and UI can share the same numbers.

/** Challenge timer is 75% of the effective standard limit (minimum 30s). */
export const CHALLENGE_TIME_RATIO = 0.75;

/** Minimum challenge time limit in seconds. */
export const CHALLENGE_MIN_TIME_SECONDS = 30;

/** Extra accuracy required to pass a challenge attempt. */
export const CHALLENGE_PASS_ACCURACY_BONUS = 10;

export function resolveChallengeTimeLimitSeconds(
  standardSeconds: number,
): number {
  const scaled = Math.floor(standardSeconds * CHALLENGE_TIME_RATIO);
  return Math.max(CHALLENGE_MIN_TIME_SECONDS, scaled);
}

export function resolveChallengePassAccuracy(levelPassAccuracy: number): number {
  return Math.min(100, levelPassAccuracy + CHALLENGE_PASS_ACCURACY_BONUS);
}
