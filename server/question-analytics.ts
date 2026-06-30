// Trusted per-question analytics for institute bank questions.

import "server-only";

import { prisma } from "@/lib/prisma";
import {
  buildQuestionAnalyticsMap,
  type QuestionAnalyticsStat,
} from "@/lib/question-analytics";
import { PracticeMode, SessionStatus } from "@/lib/generated/prisma/enums";
import type { AdminContext } from "@/server/admin";

/** Graded attempt stats keyed by bank question id for one level. */
export async function getLevelQuestionAnalytics(
  admin: AdminContext,
  levelId: string,
): Promise<Map<string, QuestionAnalyticsStat>> {
  const level = await prisma.level.findFirst({
    where: { id: levelId, instituteId: admin.instituteId },
    select: { id: true },
  });
  if (!level) {
    return new Map();
  }

  const rows = await prisma.practiceQuestion.findMany({
    where: {
      sourceQuestionId: { not: null },
      isCorrect: { not: null },
      session: {
        instituteId: admin.instituteId,
        levelId,
        status: { not: SessionStatus.IN_PROGRESS },
        mode: { not: PracticeMode.REVIEW },
      },
      sourceQuestion: {
        levelId,
        instituteId: admin.instituteId,
      },
    },
    select: {
      sourceQuestionId: true,
      isCorrect: true,
    },
  });

  const attemptRows = rows
    .filter(
      (row): row is { sourceQuestionId: string; isCorrect: boolean } =>
        row.sourceQuestionId != null && row.isCorrect != null,
    )
    .map((row) => ({
      sourceQuestionId: row.sourceQuestionId,
      isCorrect: row.isCorrect,
    }));

  return buildQuestionAnalyticsMap(attemptRows);
}
