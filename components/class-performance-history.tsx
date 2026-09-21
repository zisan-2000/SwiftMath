import { CalendarCheck, TrendingUp, UserX } from "lucide-react";

import { ClassPerformanceStatus } from "@/lib/generated/prisma/enums";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export interface StudentClassPerformanceHistory {
  rows: Array<{
    date: string;
    label: string;
    groupName: string;
    mark: string;
    maximumMark: string;
    percentage: number;
    status: ClassPerformanceStatus;
  }>;
  classCount: number;
  absentCount: number;
  overallPercentage: number;
}

export function ClassPerformanceHistory({
  history,
  title = "Class performance",
}: {
  history: StudentClassPerformanceHistory;
  title?: string;
}) {
  return (
    <section className="mt-8" aria-labelledby="class-performance-history-title">
      <h2
        id="class-performance-history-title"
        className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground"
      >
        {title}
      </h2>
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Recorded classes"
          value={history.classCount}
          icon={CalendarCheck}
        />
        <StatCard
          label="Overall performance"
          value={`${history.overallPercentage}%`}
          hint="Teacher-entered marks only"
          icon={TrendingUp}
        />
        <StatCard
          label="Absent"
          value={history.absentCount}
          hint="Counted as zero"
          icon={UserX}
        />
      </div>

      <Card>
        <CardHeader className="border-b border-border">
          <CardTitle className="text-base">Date-wise history</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {history.rows.length === 0 ? (
            <EmptyState
              icon={CalendarCheck}
              title="No class performance yet"
              description="Teacher-entered class marks will appear here."
              className="border-0"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-left text-muted-foreground">
                    <th className="px-5 py-3 font-medium">Date</th>
                    <th className="px-5 py-3 font-medium">Group</th>
                    <th className="px-5 py-3 font-medium">Marks</th>
                    <th className="px-5 py-3 font-medium">Percentage</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {history.rows.map((row) => (
                    <tr
                      key={`${row.date}:${row.groupName}`}
                      className="border-b border-border last:border-0"
                    >
                      <td className="px-5 py-3 font-medium text-foreground">
                        {row.label}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">
                        {row.groupName}
                      </td>
                      <td className="px-5 py-3 tabular-nums">
                        {row.mark}/{row.maximumMark}
                      </td>
                      <td className="px-5 py-3 tabular-nums">
                        {row.percentage}%
                      </td>
                      <td className="px-5 py-3">
                        <Badge
                          variant={
                            row.status === ClassPerformanceStatus.ABSENT
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {row.status === ClassPerformanceStatus.ABSENT
                            ? "Absent"
                            : "Present"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

