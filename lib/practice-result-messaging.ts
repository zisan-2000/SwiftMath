// Student-facing copy for practice results — pass, fail, and retry.

export interface PracticeResultContext {
  passed: boolean;
  expired: boolean;
  isReview: boolean;
  isChallenge: boolean;
  leveledUp: boolean;
  passAccuracy: number;
  accuracy: number;
  levelName: string;
}

export interface PracticeResultMessaging {
  /** Short headline under the score. */
  headline: string;
  /** Supporting sentence — includes same-level reassurance on fail. */
  body: string;
  /** Primary action label on the results card. */
  primaryActionLabel: string;
  /** Show the retry encouragement banner (failed timed attempt). */
  showRetryPrompt: boolean;
}

/** Copy for the finished practice results screen. */
export function getPracticeResultMessaging(
  ctx: PracticeResultContext,
): PracticeResultMessaging {
  if (ctx.isReview) {
    return {
      headline: "Review complete",
      body: "Review mode does not change your level. Use it to drill without a timer.",
      primaryActionLabel: "Review again",
      showRetryPrompt: false,
    };
  }

  if (ctx.isChallenge && ctx.passed) {
    return {
      headline: "Challenge cleared!",
      body: `You hit the tougher ${ctx.passAccuracy}% bar in time. Your level stays the same — use standard practice to level up.`,
      primaryActionLabel: "Challenge again",
      showRetryPrompt: false,
    };
  }

  if (ctx.isChallenge && !ctx.passed) {
    if (ctx.expired) {
      return {
        headline: "Challenge time ran out",
        body: `You stay on ${ctx.levelName}. Challenge mode uses a shorter timer and does not level you up.`,
        primaryActionLabel: "Try challenge again",
        showRetryPrompt: true,
      };
    }

    const shortOf = Math.max(0, ctx.passAccuracy - ctx.accuracy);
    return {
      headline: "Challenge not cleared",
      body:
        shortOf > 0
          ? `You scored ${ctx.accuracy}% but need ${ctx.passAccuracy}% for this challenge. Your level is unchanged.`
          : `You stay on ${ctx.levelName}. Challenge mode does not change your level.`,
      primaryActionLabel: "Try challenge again",
      showRetryPrompt: true,
    };
  }

  if (ctx.leveledUp) {
    return {
      headline: "You passed!",
      body: "You met the pass mark and unlocked the next level.",
      primaryActionLabel: "Practice at new level",
      showRetryPrompt: false,
    };
  }

  if (ctx.passed) {
    return {
      headline: "You passed!",
      body: `Great work on ${ctx.levelName}. Keep practising to build speed and accuracy.`,
      primaryActionLabel: "Practice again",
      showRetryPrompt: false,
    };
  }

  if (ctx.expired) {
    return {
      headline: "Time ran out",
      body: `You stay on ${ctx.levelName}. Submit faster next time — you need ${ctx.passAccuracy}% to pass.`,
      primaryActionLabel: "Try again",
      showRetryPrompt: true,
    };
  }

  const shortOf = Math.max(0, ctx.passAccuracy - ctx.accuracy);

  return {
    headline: "Not passed yet",
    body:
      shortOf > 0
        ? `You scored ${ctx.accuracy}% but need ${ctx.passAccuracy}% to pass. You stay on ${ctx.levelName} — try again when you're ready.`
        : `You stay on ${ctx.levelName}. Try again when you're ready.`,
    primaryActionLabel: "Try again",
    showRetryPrompt: true,
  };
}

/** Whether the latest attempt suggests a retry prompt on the practice home. */
export function shouldShowPracticeHomeRetryHint(input: {
  hasLevel: boolean;
  lastSession:
    | {
        passed: boolean;
        mode: "STANDARD" | "REVIEW" | "CHALLENGE" | "EXAM";
        status: "IN_PROGRESS" | "COMPLETED" | "EXPIRED";
        levelId: string;
      }
    | null
    | undefined;
  currentLevelId: string | null | undefined;
}): boolean {
  if (!input.hasLevel || !input.lastSession || !input.currentLevelId) {
    return false;
  }
  if (input.lastSession.mode !== "STANDARD") return false;
  if (input.lastSession.status === "IN_PROGRESS") return false;
  if (input.lastSession.passed) return false;
  return input.lastSession.levelId === input.currentLevelId;
}
