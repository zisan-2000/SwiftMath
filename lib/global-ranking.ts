// Helpers for cross-institute (global) student rankings.
// Global boards always compare one curriculum step so times are fair.

import {
  DEFAULT_STARTER_LEVELS,
  getDefaultLevelByOrderIndex,
  type DefaultLevelDef,
} from "@/lib/default-levels";
import type { LeaderboardPeriod } from "@/lib/ranking";

/** Level fields that must match the platform default for a fair global compare. */
export type CanonicalLevelMatchFields = Pick<
  DefaultLevelDef,
  | "operation"
  | "termsPerQuestion"
  | "minNumber"
  | "maxNumber"
  | "questionCount"
  | "timeLimitSeconds"
  | "passAccuracy"
>;

/** Default step when none is selected — first starter level (Addition I). */
export const DEFAULT_GLOBAL_RANKING_STEP =
  DEFAULT_STARTER_LEVELS[0]?.orderIndex ?? 1;

/** Resolve a valid curriculum step for global ranking (never returns "all"). */
export function parseGlobalRankingLevelStep(value: string | undefined): number {
  if (value && value !== "all") {
    const step = Number.parseInt(value, 10);
    if (
      Number.isFinite(step) &&
      DEFAULT_STARTER_LEVELS.some((level) => level.orderIndex === step)
    ) {
      return step;
    }
  }
  return DEFAULT_GLOBAL_RANKING_STEP;
}

/** Display name for a curriculum step on the global ranking UI. */
export function getGlobalRankingLevelName(orderIndex: number): string {
  return (
    DEFAULT_STARTER_LEVELS.find((level) => level.orderIndex === orderIndex)
      ?.name ?? `Step ${orderIndex}`
  );
}

/** Build a shareable global ranking URL preserving the time period. */
export function globalRankingHref(
  step: number,
  period: LeaderboardPeriod = "all",
): string {
  const qs = new URLSearchParams({ step: String(step) });
  if (period !== "all") qs.set("period", period);
  return `/student/ranking/global?${qs.toString()}`;
}

/**
 * Prisma `level` filter for global ranking: same step **and** the platform
 * default rules (time limit, question count, etc.). Admin-edited levels at
 * the same step are excluded so finish times stay comparable.
 */
export function buildCanonicalGlobalLevelWhere(orderIndex: number) {
  const canonical = getDefaultLevelByOrderIndex(orderIndex);
  if (!canonical) {
    throw new Error(`Unknown global ranking step: ${orderIndex}`);
  }

  const {
    operation,
    termsPerQuestion,
    minNumber,
    maxNumber,
    questionCount,
    timeLimitSeconds,
    passAccuracy,
  }: CanonicalLevelMatchFields = canonical;

  return {
    orderIndex: canonical.orderIndex,
    operation,
    termsPerQuestion,
    minNumber,
    maxNumber,
    questionCount,
    timeLimitSeconds,
    passAccuracy,
  };
}

/** Human-readable summary of the canonical rules for a step (UI hint). */
export function formatCanonicalLevelRules(orderIndex: number): string | null {
  const canonical = getDefaultLevelByOrderIndex(orderIndex);
  if (!canonical) return null;
  return `${canonical.questionCount} questions · ${canonical.timeLimitSeconds}s · pass ${canonical.passAccuracy}%`;
}

/**
 * Global ranking session composition policy (QB-12, extends 6.4c).
 *
 * Only fully dynamic sessions count — every question was generated from the
 * canonical level rules with no institute bank prompts. Hybrid (bank + dynamic)
 * and all-bank sessions are excluded so finish times stay comparable across
 * institutes with different question banks.
 */
export function buildGlobalRankingSessionFilter() {
  return {
    questions: {
      none: { sourceQuestionId: { not: null } },
    },
  } as const;
}

/** Short UI hint for students viewing the global board. */
export function formatGlobalRankingCompositionPolicy(): string {
  return "fully dynamic sessions only (no fixed bank or mixed sessions)";
}
