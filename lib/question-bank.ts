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

/** Thrown when bank-only mode cannot fill a full session from the bank pool. */
export class InsufficientBankError extends Error {
  readonly available: number;
  readonly required: number;

  constructor(available: number, required: number) {
    super(
      `Need ${required} bank question${required === 1 ? "" : "s"} but only ${available} available.`,
    );
    this.name = "InsufficientBankError";
    this.available = available;
    this.required = required;
  }
}

export interface ComposeSessionQuestionsOptions {
  /** When true, never generate dynamic fill — throw if the bank is too small. */
  bankOnly?: boolean;
  rng?: Rng;
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
 * When the bank is empty, every question is generated dynamically unless
 * `bankOnly` is set — then an InsufficientBankError is thrown.
 */
export function composeSessionQuestions(
  level: LevelConfig,
  questionCount: number,
  bankPool: BankQuestionRow[],
  options: ComposeSessionQuestionsOptions = {},
): SessionQuestionDraft[] {
  const rng = options.rng ?? Math.random;
  const picked = pickBankQuestions(bankPool, questionCount, rng);

  if (options.bankOnly && picked.length < questionCount) {
    throw new InsufficientBankError(picked.length, questionCount);
  }

  const drafts: SessionQuestionDraft[] = picked.map((q) => ({
    prompt: q.prompt,
    correctAnswer: q.correctAnswer,
    sourceQuestionId: q.id,
  }));

  if (options.bankOnly) {
    return drafts;
  }

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

export type LevelBankCoverageStatus = "empty" | "partial" | "ok" | "blocked";

export interface LevelBankCoverage {
  status: LevelBankCoverageStatus;
  headline: string;
  detail: string;
}

/** Admin-facing coverage check for a level's question bank. */
export function assessLevelBankCoverage(input: {
  sessionQuestionCount: number;
  totalBankCount: number;
  activeBankCount: number;
  bankOnly?: boolean;
}): LevelBankCoverage {
  const { sessionQuestionCount, totalBankCount, activeBankCount, bankOnly } =
    input;

  if (bankOnly) {
    if (totalBankCount === 0 || activeBankCount < sessionQuestionCount) {
      const shortBy =
        activeBankCount >= sessionQuestionCount
          ? sessionQuestionCount
          : sessionQuestionCount - activeBankCount;
      return {
        status: "blocked",
        headline: "Bank-only mode — practice blocked",
        detail:
          totalBankCount === 0
            ? `Add at least ${sessionQuestionCount} active bank questions before students can practise this level. Dynamic generation is off.`
            : `${activeBankCount} active bank question${activeBankCount === 1 ? "" : "s"} for ${sessionQuestionCount}-question sessions — add ${shortBy} more or disable bank-only mode. Teacher group disables count too.`,
      };
    }

    return {
      status: "ok",
      headline: "Bank-only mode — ready",
      detail: `${activeBankCount} active bank questions cover ${sessionQuestionCount}-question sessions. Only fixed prompts are used (no dynamic fill).`,
    };
  }

  if (totalBankCount === 0) {
    return {
      status: "empty",
      headline: "No bank questions yet",
      detail: `Sessions use dynamic generation for all ${sessionQuestionCount} questions until you add fixed prompts.`,
    };
  }

  if (activeBankCount < sessionQuestionCount) {
    const shortBy = sessionQuestionCount - activeBankCount;
    return {
      status: "partial",
      headline: "Bank smaller than session size",
      detail: `${activeBankCount} active bank question${activeBankCount === 1 ? "" : "s"} for ${sessionQuestionCount}-question sessions — the last ${shortBy} slot${shortBy === 1 ? "" : "s"} will use dynamic generation.`,
    };
  }

  return {
    status: "ok",
    headline: "Bank covers session size",
    detail: `${activeBankCount} active bank questions — enough for fully bank-backed ${sessionQuestionCount}-question sessions (before teacher group disables).`,
  };
}
