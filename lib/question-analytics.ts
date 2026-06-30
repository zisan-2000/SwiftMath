// Per bank-question analytics — aggregate graded attempt rows.

import { computePassRate } from "@/lib/analytics";

/** One graded practice row linked to a bank question. */
export interface QuestionAttemptRow {
  sourceQuestionId: string;
  isCorrect: boolean;
}

export interface QuestionAnalyticsStat {
  attemptCount: number;
  correctCount: number;
  /** Integer 0–100, rounded. */
  successRate: number;
}

/** Summarise attempt rows by bank question id. */
export function buildQuestionAnalyticsMap(
  rows: QuestionAttemptRow[],
): Map<string, QuestionAnalyticsStat> {
  const totals = new Map<string, { attemptCount: number; correctCount: number }>();

  for (const row of rows) {
    const current = totals.get(row.sourceQuestionId) ?? {
      attemptCount: 0,
      correctCount: 0,
    };
    current.attemptCount += 1;
    if (row.isCorrect) current.correctCount += 1;
    totals.set(row.sourceQuestionId, current);
  }

  const result = new Map<string, QuestionAnalyticsStat>();
  for (const [sourceQuestionId, counts] of totals) {
    result.set(sourceQuestionId, {
      attemptCount: counts.attemptCount,
      correctCount: counts.correctCount,
      successRate: computePassRate(counts.correctCount, counts.attemptCount),
    });
  }

  return result;
}

/** Short label for admin bank list rows. */
export function formatQuestionAnalyticsLabel(
  stat: QuestionAnalyticsStat | undefined,
): string | null {
  if (!stat || stat.attemptCount === 0) return null;
  return `${stat.attemptCount} attempt${stat.attemptCount === 1 ? "" : "s"} · ${stat.successRate}% correct`;
}
