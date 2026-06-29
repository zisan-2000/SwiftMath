import Link from "next/link";

import { DEFAULT_STARTER_LEVELS } from "@/lib/default-levels";
import {
  getGlobalRankingLevelName,
  globalRankingHref,
} from "@/lib/global-ranking";
import type { LeaderboardPeriod } from "@/lib/ranking";
import { cn } from "@/lib/utils";

interface GlobalRankingStepTabsProps {
  activeStep: number;
  period: LeaderboardPeriod;
}

/** Quick links to compare the same curriculum step across all institutes. */
export function GlobalRankingStepTabs({
  activeStep,
  period,
}: GlobalRankingStepTabsProps) {
  return (
    <nav
      className="mb-4 flex gap-1 overflow-x-auto rounded-lg border border-border bg-muted/40 p-1"
      aria-label="Level step"
    >
      {DEFAULT_STARTER_LEVELS.map((level) => {
        const isActive = level.orderIndex === activeStep;
        return (
          <Link
            key={level.orderIndex}
            href={globalRankingHref(level.orderIndex, period)}
            className={cn(
              "shrink-0 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
            aria-current={isActive ? "page" : undefined}
            title={getGlobalRankingLevelName(level.orderIndex)}
          >
            {level.name}
          </Link>
        );
      })}
    </nav>
  );
}
