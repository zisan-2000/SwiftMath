// Practice anti-cheat signals — pure detection helpers (Phase 2.7.4).
//
// These flags are informational only: they are stored and logged server-side
// but do not change grading, pass, or level-up in this phase.

/** Known anomaly flag values persisted on `PracticeSession.anomalyFlags`. */
export const AnomalyFlag = {
  /** Timed submit finished faster than a plausible human minimum. */
  FAST_SUBMIT: "FAST_SUBMIT",
  /** Client reported many tab/window visibility hides during the session. */
  HIGH_TAB_BLUR: "HIGH_TAB_BLUR",
} as const;

export type AnomalyFlag = (typeof AnomalyFlag)[keyof typeof AnomalyFlag];

/** Minimum seconds per question for a timed STANDARD attempt. */
export const MIN_SECONDS_PER_QUESTION = 1;

/** Tab-hide count at/above which we record HIGH_TAB_BLUR (client hint only). */
export const TAB_BLUR_THRESHOLD = 5;

/** Maximum tab-blur count accepted from the client (sanity cap). */
export const MAX_TAB_BLUR_COUNT = 100;

/**
 * True when a timed standard attempt was submitted impossibly fast. Review
 * mode and auto-submit on expiry are excluded by the caller.
 */
export function detectFastSubmit(
  startedAtMs: number,
  submittedAtMs: number,
  questionCount: number,
): boolean {
  if (questionCount <= 0) return false;
  const elapsedSec = (submittedAtMs - startedAtMs) / 1000;
  return elapsedSec < questionCount * MIN_SECONDS_PER_QUESTION;
}

/** True when the client-reported tab blur count crosses the threshold. */
export function detectHighTabBlur(
  tabBlurCount: number,
  threshold: number = TAB_BLUR_THRESHOLD,
): boolean {
  return tabBlurCount >= threshold;
}

/** Sanitize untrusted client telemetry before use. */
export function sanitizeTabBlurCount(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) return 0;
  return Math.min(MAX_TAB_BLUR_COUNT, Math.max(0, Math.floor(value)));
}

export interface CollectAnomalyFlagsInput {
  startedAtMs: number;
  submittedAtMs: number;
  questionCount: number;
  /** Only STANDARD timed sessions are checked for fast submit. */
  checkFastSubmit: boolean;
  tabBlurCount: number;
}

/** Build the list of anomaly flags for one submission. */
export function collectAnomalyFlags(
  input: CollectAnomalyFlagsInput,
): AnomalyFlag[] {
  const flags: AnomalyFlag[] = [];

  if (
    input.checkFastSubmit &&
    detectFastSubmit(
      input.startedAtMs,
      input.submittedAtMs,
      input.questionCount,
    )
  ) {
    flags.push(AnomalyFlag.FAST_SUBMIT);
  }

  if (detectHighTabBlur(input.tabBlurCount)) {
    flags.push(AnomalyFlag.HIGH_TAB_BLUR);
  }

  return flags;
}
