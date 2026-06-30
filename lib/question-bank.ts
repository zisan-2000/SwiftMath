// Institute question bank helpers — pure pick/filter logic for tests + server.

import {
  generateQuestion,
  type GeneratedQuestion,
  type LevelConfig,
  type Rng,
} from "@/lib/practice-logic";

export interface BankQuestionRow {
  id: string;
  prompt: string;
  correctAnswer: number;
  isActive: boolean;
}

export interface SessionQuestionDraft {
  prompt: string;
  correctAnswer: number;
  sourceQuestionId: string | null;
}

/** Fisher–Yates shuffle (mutates copy). */
export function shuffleInPlace<T>(items: T[], rng: Rng = Math.random): T[] {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [items[i], items[j]] = [items[j]!, items[i]!];
  }
  return items;
}

/** Whether a bank row is eligible after institute + group rules. */
export function isBankQuestionEnabled(
  question: BankQuestionRow,
  disabledQuestionIds: ReadonlySet<string>,
): boolean {
  return question.isActive && !disabledQuestionIds.has(question.id);
}

/** Filter the institute bank to the effective pool for one student group. */
export function filterEnabledBankQuestions(
  questions: BankQuestionRow[],
  disabledQuestionIds: ReadonlySet<string>,
): BankQuestionRow[] {
  return questions.filter((q) => isBankQuestionEnabled(q, disabledQuestionIds));
}

/** Random sample without replacement (or all if count >= pool). */
export function pickBankQuestions(
  pool: BankQuestionRow[],
  count: number,
  rng: Rng = Math.random,
): BankQuestionRow[] {
  if (count <= 0 || pool.length === 0) return [];
  const shuffled = shuffleInPlace([...pool], rng);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

/**
 * Build session questions: bank first, then dynamic fill for any remainder.
 * When the bank is empty, every question is generated dynamically.
 */
export function composeSessionQuestions(
  level: LevelConfig,
  questionCount: number,
  bankPool: BankQuestionRow[],
  rng: Rng = Math.random,
): SessionQuestionDraft[] {
  const picked = pickBankQuestions(bankPool, questionCount, rng);
  const drafts: SessionQuestionDraft[] = picked.map((q) => ({
    prompt: q.prompt,
    correctAnswer: q.correctAnswer,
    sourceQuestionId: q.id,
  }));

  while (drafts.length < questionCount) {
    const generated: GeneratedQuestion = generateQuestion(level, rng);
    drafts.push({
      prompt: generated.prompt,
      correctAnswer: generated.correctAnswer,
      sourceQuestionId: null,
    });
  }

  return drafts;
}
