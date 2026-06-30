// Default question bank copied into every new institute (Super Admin create).
//
// Shared by `createInstitute()` so each tenant starts with fixed prompts that
// fully cover session size before admins customize via /admin/levels/.../questions.
// Keys match `DefaultLevelDef.orderIndex` in `lib/default-levels.ts`.

import { QuestionDifficulty, QuestionStatus } from "@/lib/generated/prisma/enums";
import {
  DEFAULT_STARTER_LEVELS,
  type DefaultLevelDef,
} from "@/lib/default-levels";

/** One bank row before `instituteId` / `levelId` are known at insert time. */
export interface DefaultQuestionDef {
  prompt: string;
  correctAnswer: number;
  category?: string | null;
  difficulty?: QuestionDifficulty;
}

/** Starter bank entries keyed by curriculum step (`level.orderIndex`). */
export const DEFAULT_STARTER_QUESTION_BANK: Record<number, DefaultQuestionDef[]> =
  {
    1: [
      { prompt: "3 + 4", correctAnswer: 7, category: "Single digit", difficulty: QuestionDifficulty.EASY },
      { prompt: "2 + 5", correctAnswer: 7, category: "Single digit", difficulty: QuestionDifficulty.EASY },
      { prompt: "6 + 1", correctAnswer: 7, category: "Single digit", difficulty: QuestionDifficulty.EASY },
      { prompt: "4 + 4", correctAnswer: 8, category: "Single digit", difficulty: QuestionDifficulty.EASY },
      { prompt: "5 + 3", correctAnswer: 8, category: "Single digit", difficulty: QuestionDifficulty.EASY },
      { prompt: "7 + 2", correctAnswer: 9, category: "Single digit", difficulty: QuestionDifficulty.EASY },
      { prompt: "1 + 8", correctAnswer: 9, category: "Single digit", difficulty: QuestionDifficulty.EASY },
      { prompt: "8 + 1", correctAnswer: 9, category: "Single digit", difficulty: QuestionDifficulty.EASY },
      { prompt: "2 + 6", correctAnswer: 8, category: "Single digit", difficulty: QuestionDifficulty.EASY },
      { prompt: "5 + 4", correctAnswer: 9, category: "Single digit", difficulty: QuestionDifficulty.EASY },
    ],
    2: [
      { prompt: "1 + 2 + 3", correctAnswer: 6, category: "Three terms", difficulty: QuestionDifficulty.EASY },
      { prompt: "2 + 3 + 4", correctAnswer: 9, category: "Three terms", difficulty: QuestionDifficulty.EASY },
      { prompt: "3 + 3 + 3", correctAnswer: 9, category: "Three terms", difficulty: QuestionDifficulty.EASY },
      { prompt: "4 + 3 + 2", correctAnswer: 9, category: "Three terms", difficulty: QuestionDifficulty.EASY },
      { prompt: "1 + 4 + 4", correctAnswer: 9, category: "Three terms", difficulty: QuestionDifficulty.EASY },
      { prompt: "2 + 5 + 2", correctAnswer: 9, category: "Three terms", difficulty: QuestionDifficulty.EASY },
      { prompt: "3 + 2 + 4", correctAnswer: 9, category: "Three terms", difficulty: QuestionDifficulty.EASY },
      { prompt: "1 + 8 + 9", correctAnswer: 18, category: "Three terms", difficulty: QuestionDifficulty.MEDIUM },
      { prompt: "2 + 7 + 6", correctAnswer: 15, category: "Three terms", difficulty: QuestionDifficulty.MEDIUM },
      { prompt: "5 + 5 + 5", correctAnswer: 15, category: "Three terms", difficulty: QuestionDifficulty.MEDIUM },
    ],
    3: [
      { prompt: "12 + 25 + 30", correctAnswer: 67, category: "Two-digit", difficulty: QuestionDifficulty.MEDIUM },
      { prompt: "10 + 15 + 20", correctAnswer: 45, category: "Two-digit", difficulty: QuestionDifficulty.MEDIUM },
      { prompt: "11 + 22 + 33", correctAnswer: 66, category: "Two-digit", difficulty: QuestionDifficulty.MEDIUM },
      { prompt: "15 + 10 + 25", correctAnswer: 50, category: "Two-digit", difficulty: QuestionDifficulty.MEDIUM },
      { prompt: "20 + 30 + 40", correctAnswer: 90, category: "Two-digit", difficulty: QuestionDifficulty.MEDIUM },
      { prompt: "12 + 12 + 12", correctAnswer: 36, category: "Two-digit", difficulty: QuestionDifficulty.MEDIUM },
      { prompt: "25 + 25 + 25", correctAnswer: 75, category: "Two-digit", difficulty: QuestionDifficulty.MEDIUM },
      { prompt: "10 + 20 + 30", correctAnswer: 60, category: "Two-digit", difficulty: QuestionDifficulty.MEDIUM },
      { prompt: "15 + 15 + 15", correctAnswer: 45, category: "Two-digit", difficulty: QuestionDifficulty.MEDIUM },
      { prompt: "18 + 22 + 30", correctAnswer: 70, category: "Two-digit", difficulty: QuestionDifficulty.MEDIUM },
    ],
    4: [
      { prompt: "15 − 7", correctAnswer: 8, category: "Subtraction", difficulty: QuestionDifficulty.EASY },
      { prompt: "20 − 5", correctAnswer: 15, category: "Subtraction", difficulty: QuestionDifficulty.EASY },
      { prompt: "18 − 9", correctAnswer: 9, category: "Subtraction", difficulty: QuestionDifficulty.EASY },
      { prompt: "12 − 4", correctAnswer: 8, category: "Subtraction", difficulty: QuestionDifficulty.EASY },
      { prompt: "19 − 11", correctAnswer: 8, category: "Subtraction", difficulty: QuestionDifficulty.EASY },
      { prompt: "10 − 3", correctAnswer: 7, category: "Subtraction", difficulty: QuestionDifficulty.EASY },
      { prompt: "20 − 12", correctAnswer: 8, category: "Subtraction", difficulty: QuestionDifficulty.EASY },
      { prompt: "16 − 6", correctAnswer: 10, category: "Subtraction", difficulty: QuestionDifficulty.EASY },
      { prompt: "14 − 2", correctAnswer: 12, category: "Subtraction", difficulty: QuestionDifficulty.EASY },
      { prompt: "20 − 1", correctAnswer: 19, category: "Subtraction", difficulty: QuestionDifficulty.EASY },
    ],
    5: [
      { prompt: "10 + 5 − 3", correctAnswer: 12, category: "Mixed", difficulty: QuestionDifficulty.MEDIUM },
      { prompt: "8 − 2 + 4", correctAnswer: 10, category: "Mixed", difficulty: QuestionDifficulty.MEDIUM },
      { prompt: "15 − 5 + 2", correctAnswer: 12, category: "Mixed", difficulty: QuestionDifficulty.MEDIUM },
      { prompt: "12 + 3 − 7", correctAnswer: 8, category: "Mixed", difficulty: QuestionDifficulty.MEDIUM },
      { prompt: "20 − 10 + 5", correctAnswer: 15, category: "Mixed", difficulty: QuestionDifficulty.MEDIUM },
      { prompt: "5 + 5 − 2", correctAnswer: 8, category: "Mixed", difficulty: QuestionDifficulty.MEDIUM },
      { prompt: "18 − 8 + 4", correctAnswer: 14, category: "Mixed", difficulty: QuestionDifficulty.MEDIUM },
      { prompt: "7 + 3 − 1", correctAnswer: 9, category: "Mixed", difficulty: QuestionDifficulty.MEDIUM },
      { prompt: "16 − 6 + 2", correctAnswer: 12, category: "Mixed", difficulty: QuestionDifficulty.MEDIUM },
      { prompt: "10 − 4 + 6", correctAnswer: 12, category: "Mixed", difficulty: QuestionDifficulty.MEDIUM },
    ],
    6: [
      { prompt: "2 × 3", correctAnswer: 6, category: "Times tables", difficulty: QuestionDifficulty.EASY },
      { prompt: "3 × 4", correctAnswer: 12, category: "Times tables", difficulty: QuestionDifficulty.EASY },
      { prompt: "4 × 5", correctAnswer: 20, category: "Times tables", difficulty: QuestionDifficulty.EASY },
      { prompt: "5 × 6", correctAnswer: 30, category: "Times tables", difficulty: QuestionDifficulty.EASY },
      { prompt: "6 × 7", correctAnswer: 42, category: "Times tables", difficulty: QuestionDifficulty.MEDIUM },
      { prompt: "7 × 8", correctAnswer: 56, category: "Times tables", difficulty: QuestionDifficulty.MEDIUM },
      { prompt: "8 × 9", correctAnswer: 72, category: "Times tables", difficulty: QuestionDifficulty.MEDIUM },
      { prompt: "1 × 9", correctAnswer: 9, category: "Times tables", difficulty: QuestionDifficulty.EASY },
      { prompt: "2 × 8", correctAnswer: 16, category: "Times tables", difficulty: QuestionDifficulty.EASY },
      { prompt: "3 × 7", correctAnswer: 21, category: "Times tables", difficulty: QuestionDifficulty.EASY },
    ],
    7: [
      { prompt: "2 × 3 × 4", correctAnswer: 24, category: "Three factors", difficulty: QuestionDifficulty.MEDIUM },
      { prompt: "1 × 2 × 3", correctAnswer: 6, category: "Three factors", difficulty: QuestionDifficulty.EASY },
      { prompt: "2 × 2 × 2", correctAnswer: 8, category: "Three factors", difficulty: QuestionDifficulty.EASY },
      { prompt: "3 × 3 × 3", correctAnswer: 27, category: "Three factors", difficulty: QuestionDifficulty.MEDIUM },
      { prompt: "1 × 5 × 2", correctAnswer: 10, category: "Three factors", difficulty: QuestionDifficulty.EASY },
      { prompt: "2 × 4 × 3", correctAnswer: 24, category: "Three factors", difficulty: QuestionDifficulty.MEDIUM },
      { prompt: "3 × 2 × 4", correctAnswer: 24, category: "Three factors", difficulty: QuestionDifficulty.MEDIUM },
      { prompt: "2 × 3 × 3", correctAnswer: 18, category: "Three factors", difficulty: QuestionDifficulty.MEDIUM },
      { prompt: "1 × 9 × 2", correctAnswer: 18, category: "Three factors", difficulty: QuestionDifficulty.MEDIUM },
      { prompt: "4 × 2 × 3", correctAnswer: 24, category: "Three factors", difficulty: QuestionDifficulty.MEDIUM },
    ],
    8: [
      { prompt: "12 ÷ 3", correctAnswer: 4, category: "Division", difficulty: QuestionDifficulty.EASY },
      { prompt: "20 ÷ 4", correctAnswer: 5, category: "Division", difficulty: QuestionDifficulty.EASY },
      { prompt: "18 ÷ 6", correctAnswer: 3, category: "Division", difficulty: QuestionDifficulty.EASY },
      { prompt: "24 ÷ 8", correctAnswer: 3, category: "Division", difficulty: QuestionDifficulty.EASY },
      { prompt: "15 ÷ 5", correctAnswer: 3, category: "Division", difficulty: QuestionDifficulty.EASY },
      { prompt: "10 ÷ 2", correctAnswer: 5, category: "Division", difficulty: QuestionDifficulty.EASY },
      { prompt: "36 ÷ 9", correctAnswer: 4, category: "Division", difficulty: QuestionDifficulty.EASY },
      { prompt: "28 ÷ 7", correctAnswer: 4, category: "Division", difficulty: QuestionDifficulty.EASY },
      { prompt: "14 ÷ 2", correctAnswer: 7, category: "Division", difficulty: QuestionDifficulty.EASY },
      { prompt: "21 ÷ 3", correctAnswer: 7, category: "Division", difficulty: QuestionDifficulty.EASY },
    ],
    9: [
      { prompt: "24 ÷ 6", correctAnswer: 4, category: "Division", difficulty: QuestionDifficulty.MEDIUM },
      { prompt: "36 ÷ 9", correctAnswer: 4, category: "Division", difficulty: QuestionDifficulty.MEDIUM },
      { prompt: "48 ÷ 8", correctAnswer: 6, category: "Division", difficulty: QuestionDifficulty.MEDIUM },
      { prompt: "56 ÷ 7", correctAnswer: 8, category: "Division", difficulty: QuestionDifficulty.MEDIUM },
      { prompt: "30 ÷ 5", correctAnswer: 6, category: "Division", difficulty: QuestionDifficulty.MEDIUM },
      { prompt: "42 ÷ 6", correctAnswer: 7, category: "Division", difficulty: QuestionDifficulty.MEDIUM },
      { prompt: "45 ÷ 9", correctAnswer: 5, category: "Division", difficulty: QuestionDifficulty.MEDIUM },
      { prompt: "54 ÷ 9", correctAnswer: 6, category: "Division", difficulty: QuestionDifficulty.MEDIUM },
      { prompt: "60 ÷ 12", correctAnswer: 5, category: "Division", difficulty: QuestionDifficulty.MEDIUM },
      { prompt: "72 ÷ 12", correctAnswer: 6, category: "Division", difficulty: QuestionDifficulty.MEDIUM },
    ],
  };

/** Starter questions for one curriculum step; empty when none are defined. */
export function getStarterQuestionsForLevel(
  orderIndex: number,
): DefaultQuestionDef[] {
  return DEFAULT_STARTER_QUESTION_BANK[orderIndex] ?? [];
}

/** Rows ready for `levelQuestion.createMany` after levels exist. */
export function buildStarterQuestionBankRows(input: {
  instituteId: string;
  levels: ReadonlyArray<{ id: string; orderIndex: number }>;
}): Array<{
  instituteId: string;
  levelId: string;
  prompt: string;
  correctAnswer: number;
  category: string | null;
  difficulty: QuestionDifficulty;
  orderIndex: number;
  isActive: boolean;
  status: QuestionStatus;
}> {
  const rows: ReturnType<typeof buildStarterQuestionBankRows> = [];

  for (const level of input.levels) {
    const questions = getStarterQuestionsForLevel(level.orderIndex);
    for (let i = 0; i < questions.length; i += 1) {
      const q = questions[i]!;
      rows.push({
        instituteId: input.instituteId,
        levelId: level.id,
        prompt: q.prompt,
        correctAnswer: q.correctAnswer,
        category: q.category?.trim() || null,
        difficulty: q.difficulty ?? QuestionDifficulty.MEDIUM,
        orderIndex: i,
        isActive: true,
        status: QuestionStatus.PUBLISHED,
      });
    }
  }

  return rows;
}

/** Whether every starter level has enough active bank rows for full coverage. */
export function assessStarterBankCoverage(
  levels: ReadonlyArray<Pick<DefaultLevelDef, "orderIndex" | "questionCount">>,
): { ok: true } | { ok: false; gaps: string[] } {
  const gaps: string[] = [];

  for (const level of levels) {
    const bankSize = getStarterQuestionsForLevel(level.orderIndex).length;
    if (bankSize < level.questionCount) {
      gaps.push(
        `orderIndex ${level.orderIndex}: ${bankSize} questions (need ${level.questionCount})`,
      );
    }
  }

  return gaps.length === 0 ? { ok: true } : { ok: false, gaps };
}
