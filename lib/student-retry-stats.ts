import { PracticeMode, SessionStatus } from "@/lib/generated/prisma/enums";

/** Finished timed-practice attempts that did not pass (incl. expired). */
export function failedStandardSessionWhere(
  studentId: string,
  levelId?: string,
) {
  return {
    studentId,
    mode: PracticeMode.STANDARD,
    status: { not: SessionStatus.IN_PROGRESS },
    passed: false,
    ...(levelId ? { levelId } : {}),
  };
}

export interface RetryCountDisplay {
  /** Failed standard attempts at the student's current level. */
  atCurrentLevel: number | null;
  /** Failed standard attempts across all levels. */
  total: number;
  hint: string;
}

/** Build teacher-facing retry labels from server counts. */
export function formatRetryCountDisplay(
  total: number,
  atCurrentLevel: number | null,
): RetryCountDisplay {
  if (atCurrentLevel == null) {
    return {
      atCurrentLevel: null,
      total,
      hint: "Failed timed attempts (all levels)",
    };
  }

  if (total === atCurrentLevel) {
    return {
      atCurrentLevel,
      total,
      hint: "Failed timed attempts at current level",
    };
  }

  return {
    atCurrentLevel,
    total,
    hint: `${atCurrentLevel} at current level · ${total} overall`,
  };
}
