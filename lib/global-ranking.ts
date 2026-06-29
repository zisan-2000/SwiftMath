// Helpers for cross-institute (global) student rankings.
// Global boards always compare one curriculum step so times are fair.

import { DEFAULT_STARTER_LEVELS } from "@/lib/default-levels";
import type { LeaderboardPeriod } from "@/lib/ranking";

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
