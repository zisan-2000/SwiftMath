import Link from "next/link";

import type { LeaderboardPeriod } from "@/lib/ranking";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const SELECT_CLASS =
  "flex h-9 w-full min-w-[10rem] rounded-md border border-input bg-background px-3 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring";

export interface TeacherRankingFilterValues {
  period: LeaderboardPeriod;
  view: string;
  levelId: string;
}

interface TeacherRankingFiltersProps {
  values: TeacherRankingFilterValues;
  levels: { id: string; name: string }[];
  groups: { id: string; name: string }[];
}

/** GET form that drives `/teacher/ranking` filters via search params. */
export function TeacherRankingFilters({
  values,
  levels,
  groups,
}: TeacherRankingFiltersProps) {
  return (
    <form
      method="get"
      className="mb-6 flex flex-col gap-4 rounded-lg border border-border bg-card p-4 sm:flex-row sm:flex-wrap sm:items-end"
    >
      <div className="flex min-w-[10rem] flex-1 flex-col gap-1.5">
        <Label htmlFor="teacher-ranking-period">Time period</Label>
        <select
          id="teacher-ranking-period"
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
        <Label htmlFor="teacher-ranking-view">Students</Label>
        <select
          id="teacher-ranking-view"
          name="view"
          defaultValue={values.view}
          className={SELECT_CLASS}
        >
          <option value="institute">Whole institute</option>
          <option value="mine">All my groups</option>
          {groups.map((group) => (
            <option key={group.id} value={`group:${group.id}`}>
              {group.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex min-w-[10rem] flex-1 flex-col gap-1.5">
        <Label htmlFor="teacher-ranking-level">Level stats</Label>
        <select
          id="teacher-ranking-level"
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
          values.view !== "institute" ||
          values.levelId !== "all") && (
          <Button type="button" size="sm" variant="outline" asChild>
            <Link href="/teacher/ranking">Reset</Link>
          </Button>
        )}
      </div>
    </form>
  );
}
