import type { Metadata } from "next";
import { Trophy } from "lucide-react";

import {
  parseClassPerformancePeriod,
  type ClassPerformancePeriod,
} from "@/lib/class-performance";
import { getGroupClassPerformanceRanking } from "@/server/class-performance";
import { loadTeacherGroupPageContext } from "@/server/teacher-page";
import { TeacherGroupShell } from "@/components/teacher/teacher-group-shell";
import { ClassPerformanceRankingTable } from "@/components/teacher/class-performance-ranking-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Label } from "@/components/ui/label";

export const metadata: Metadata = { title: "Class performance ranking" };

const PERIOD_LABELS: Record<ClassPerformancePeriod, string> = {
  all: "All time",
  "30": "Last 30 days",
  "60": "Last 2 months",
  "180": "Last 6 months",
};

export default async function ClassPerformanceRankingPage({
  params,
  searchParams,
}: {
  params: Promise<{ groupId: string }>;
  searchParams: Promise<{ period?: string }>;
}) {
  const [{ groupId }, query] = await Promise.all([params, searchParams]);
  const period = parseClassPerformancePeriod(query.period);
  const { teacher, institute, group } = await loadTeacherGroupPageContext(groupId);
  const ranking = await getGroupClassPerformanceRanking(teacher, groupId, period);

  if (!ranking) return null;

  return (
    <TeacherGroupShell
      user={teacher}
      institute={institute}
      groupId={groupId}
      groupName={group.name}
      title="Class performance ranking"
      subtitle="Only teacher-entered class marks are used. Exam, practice, and level-up results are excluded."
      backHref={`/teacher/groups/${groupId}/performance`}
      backLabel="Back to class performance"
    >
      <form
        method="get"
        className="mb-6 flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-end"
      >
        <div className="min-w-0 flex-1 space-y-1.5">
          <Label htmlFor="class-ranking-period">Time period</Label>
          <select
            id="class-ranking-period"
            name="period"
            defaultValue={period}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm sm:max-w-xs"
          >
            {Object.entries(PERIOD_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" size="sm">Apply</Button>
      </form>

      <Card>
        <CardHeader className="border-b border-border">
          <CardTitle className="text-base">
            {PERIOD_LABELS[period]} · {ranking.classCount} classes
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {ranking.rows.length === 0 || ranking.classCount === 0 ? (
            <EmptyState
              icon={Trophy}
              title="No class performance ranking yet"
              description="Save class marks for this period to build the separate ranking."
              className="border-0"
            />
          ) : (
            <ClassPerformanceRankingTable
              groupId={groupId}
              rows={ranking.rows}
            />
          )}
        </CardContent>
      </Card>
    </TeacherGroupShell>
  );
}
