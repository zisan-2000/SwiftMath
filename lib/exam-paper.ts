// Fixed scheduled-exam paper helpers — deterministic question pick for tests + server.

import {
  composeSessionQuestions,
  type BankQuestionRow,
  type SessionQuestionDraft,
} from "@/lib/question-bank";
import type { LevelConfig, Rng } from "@/lib/practice-logic";

/** Deterministic RNG from a string seed (same seed → same sequence). */
export function createSeededRng(seed: string): Rng {
  let state = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    state ^= seed.charCodeAt(i);
    state = Math.imul(state, 16777619);
  }
  state >>>= 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Build one fixed paper shared by every student on a scheduled exam. */
export function buildFixedExamPaper(
  level: LevelConfig & { questionCount: number; bankOnly?: boolean },
  bankPool: BankQuestionRow[],
  seed: string,
): SessionQuestionDraft[] {
  return composeSessionQuestions(level, level.questionCount, bankPool, {
    bankOnly: level.bankOnly ?? false,
    rng: createSeededRng(seed),
  });
}
