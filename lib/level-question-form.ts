// Parse admin level-question form fields.

import { QuestionDifficulty } from "@/lib/generated/prisma/enums";

const DIFFICULTIES = new Set<string>(Object.values(QuestionDifficulty));

export interface ParsedLevelQuestionInput {
  prompt: string;
  correctAnswer: number;
  category: string | null;
  difficulty: QuestionDifficulty;
}

export function parseLevelQuestionForm(input: {
  prompt: string;
  correctAnswerRaw: string;
  category?: string;
  difficultyRaw: string;
}): { ok: true; data: ParsedLevelQuestionInput } | { ok: false; error: string } {
  const prompt = input.prompt.trim();
  if (!prompt) {
    return { ok: false, error: "Question prompt is required." };
  }
  if (prompt.length > 200) {
    return { ok: false, error: "Prompt must be 200 characters or fewer." };
  }

  const answerRaw = input.correctAnswerRaw.trim();
  if (!/^-?\d+$/.test(answerRaw)) {
    return { ok: false, error: "Enter a whole-number answer." };
  }
  const correctAnswer = Number(answerRaw);
  if (!Number.isSafeInteger(correctAnswer)) {
    return { ok: false, error: "Answer is out of range." };
  }

  const categoryRaw = input.category?.trim() ?? "";
  const category = categoryRaw.length > 0 ? categoryRaw.slice(0, 60) : null;

  const difficultyRaw = input.difficultyRaw.trim().toUpperCase();
  if (!DIFFICULTIES.has(difficultyRaw)) {
    return { ok: false, error: "Choose a valid difficulty." };
  }

  return {
    ok: true,
    data: {
      prompt,
      correctAnswer,
      category,
      difficulty: difficultyRaw as QuestionDifficulty,
    },
  };
}
