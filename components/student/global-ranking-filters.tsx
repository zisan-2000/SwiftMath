import Link from "next/link";

import {
  DEFAULT_GLOBAL_RANKING_STEP,
  globalRankingHref,
} from "@/lib/global-ranking";
import type { LeaderboardPeriod } from "@/lib/ranking";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const SELECT_CLASS =
  "flex h-9 w-full min-w-[10rem] rounded-md border border-input bg-background px-3 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring";

export interface GlobalRankingFilterValues {
  period: LeaderboardPeriod;
  levelStep: number;
}

interface GlobalRankingFiltersProps {
  values: GlobalRankingFilterValues;
}

/** GET form for global ranking time period (level step uses tabs above). */
export function GlobalRankingFilters({ values }: GlobalRankingFiltersProps) {
  return (
    <form
      method="get"
      className="mb-4 flex flex-col gap-4 rounded-lg border border-border bg-card p-4 sm:flex-row sm:flex-wrap sm:items-end"
    >
      <input type="hidden" name="step" value={String(values.levelStep)} />

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

      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm">
          Apply
        </Button>
        {values.period !== "all" && (
          <Button type="button" size="sm" variant="outline" asChild>
            <Link
              href={globalRankingHref(
                values.levelStep,
                "all",
              )}
            >
              Reset period
            </Link>
          </Button>
        )}
      </div>
    </form>
  );
}
