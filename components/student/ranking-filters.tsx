import Link from "next/link";

import type { LeaderboardPeriod } from "@/lib/ranking";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const SELECT_CLASS =
  "flex h-9 w-full min-w-[10rem] rounded-md border border-input bg-background px-3 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring";

export interface RankingFilterValues {
  period: LeaderboardPeriod;
  scope: "all" | "group";
  levelId: string;
}

interface RankingFiltersProps {
  values: RankingFilterValues;
  levels: { id: string; name: string }[];
  groupName: string | null;
}

/** GET form that drives `/student/ranking` filters via search params. */
export function RankingFilters({
  values,
  levels,
  groupName,
}: RankingFiltersProps) {
  return (
    <form
      method="get"
      className="mb-6 flex flex-col gap-4 rounded-lg border border-border bg-card p-4 sm:flex-row sm:flex-wrap sm:items-end"
    >
      <div className="flex min-w-[10rem] flex-1 flex-col gap-1.5">
        <Label htmlFor="ranking-period">Time period</Label>
        <select
          id="ranking-period"
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
        <Label htmlFor="ranking-scope">Students</Label>
        <select
          id="ranking-scope"
          name="scope"
          defaultValue={values.scope}
          className={SELECT_CLASS}
          disabled={!groupName}
        >
          <option value="all">Whole institute</option>
          <option value="group">
            {groupName ? `My group (${groupName})` : "My group"}
          </option>
        </select>
      </div>

      <div className="flex min-w-[10rem] flex-1 flex-col gap-1.5">
        <Label htmlFor="ranking-level">Level stats</Label>
        <select
          id="ranking-level"
          name="level"
          defaultValue={values.levelId}
          className={SELECT_CLASS}
        >
          <option value="all">All levels</option>
          {levels.map((level) => (
            <option key={level.id} value={level.id}>
              {level.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm">
          Apply
        </Button>
        {(values.period !== "all" ||
          values.scope !== "all" ||
          values.levelId !== "all") && (
          <Button type="button" size="sm" variant="outline" asChild>
            <Link href="/student/ranking">Reset</Link>
          </Button>
        )}
      </div>
    </form>
  );
}
