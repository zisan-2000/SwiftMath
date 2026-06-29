import Link from "next/link";

import type { LeaderboardPeriod } from "@/lib/ranking";
import { DEFAULT_STARTER_LEVELS } from "@/lib/default-levels";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const SELECT_CLASS =
  "flex h-9 w-full min-w-[10rem] rounded-md border border-input bg-background px-3 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring";

export interface GlobalRankingFilterValues {
  period: LeaderboardPeriod;
  levelStep: string;
}

interface GlobalRankingFiltersProps {
  values: GlobalRankingFilterValues;
}

/** GET form for `/student/ranking/global` filters. */
export function GlobalRankingFilters({ values }: GlobalRankingFiltersProps) {
  return (
    <form
      method="get"
      className="mb-6 flex flex-col gap-4 rounded-lg border border-border bg-card p-4 sm:flex-row sm:flex-wrap sm:items-end"
    >
      <div className="flex min-w-[10rem] flex-1 flex-col gap-1.5">
        <Label htmlFor="global-ranking-period">Time period</Label>
        <select
          id="global-ranking-period"
          name="period"
          defaultValue={values.period}
          className={SELECT_CLASS}
        >
          <option value="all">All time</option>
          <option value="week">Last 7 days</option>
          <option value="month">Last 30 days</option>
        </select>
      </div>

      <div className="flex min-w-[10rem] flex-1 flex-col gap-1.5">
        <Label htmlFor="global-ranking-step">Level step</Label>
        <select
          id="global-ranking-step"
          name="step"
          defaultValue={values.levelStep}
          className={SELECT_CLASS}
        >
          <option value="all">All levels</option>
          {DEFAULT_STARTER_LEVELS.map((level) => (
            <option key={level.orderIndex} value={String(level.orderIndex)}>
              {level.name} (step {level.orderIndex})
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm">
          Apply
        </Button>
        {(values.period !== "all" || values.levelStep !== "all") && (
          <Button type="button" size="sm" variant="outline" asChild>
            <Link href="/student/ranking/global">Reset</Link>
          </Button>
        )}
      </div>
    </form>
  );
}
