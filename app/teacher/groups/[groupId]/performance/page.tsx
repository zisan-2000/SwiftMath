import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, CalendarCheck, Trophy } from "lucide-react";

import { getGroupClassPerformanceWorkspace } from "@/server/class-performance";
import { loadTeacherGroupPageContext } from "@/server/teacher-page";
import { ClassPerformanceEntryForm } from "@/components/teacher/class-performance-entry-form";
import { ClassPerformanceTrendChart } from "@/components/teacher/class-performance-trend-chart";
import { TeacherGroupShell } from "@/components/teacher/teacher-group-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Class performance" };

export default async function ClassPerformancePage({
  params,
  searchParams,
}: {
  params: Promise<{ groupId: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const [{ groupId }, query] = await Promise.all([params, searchParams]);
  const { teacher, institute, group } = await loadTeacherGroupPageContext(groupId);
  const workspace = await getGroupClassPerformanceWorkspace(
    teacher,
    groupId,
    query.date,
  );

  if (!workspace) return null;

  return (
    <TeacherGroupShell
      user={teacher}
      institute={institute}
      groupId={groupId}
      groupName={group.name}
      subtitle="Teacher-entered class marks — separate from exams, practice, and level-up."
      actions={
        <Button asChild variant="outline">
          <Link href={`/teacher/groups/${groupId}/performance/ranking`}>
            <Trophy className="h-4 w-4" /> Class ranking
          </Link>
        </Button>
      }
    >
      <ClassPerformanceEntryForm
        key={`${workspace.selectedDate}:${workspace.isExisting}:${workspace.maximumMark}`}
        groupId={groupId}
        selectedDate={workspace.selectedDate}
        maximumMark={workspace.maximumMark}
        students={workspace.students}
        isExisting={workspace.isExisting}
      />

      <div className="mt-6">
        <ClassPerformanceTrendChart data={workspace.history} />
      </div>

      <Card className="mt-6">
        <CardHeader className="border-b border-border">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">Date-wise records</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Open any date to review or update that class.
              </p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href={`/teacher/ranking?view=group:${groupId}`}>
                <BarChart3 className="h-4 w-4" /> Exam/practice ranking
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {workspace.history.length === 0 ? (
            <EmptyState
              icon={CalendarCheck}
              title="No saved class dates"
              description="Complete the form above to create the first record."
              className="border-0"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-left text-muted-foreground">
                    <th className="px-5 py-3 font-medium">Date</th>
                    <th className="px-5 py-3 font-medium">Maximum</th>
                    <th className="px-5 py-3 font-medium">Group average</th>
                    <th className="px-5 py-3 font-medium">Present</th>
                    <th className="px-5 py-3 font-medium">Absent</th>
                    <th className="px-5 py-3 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {workspace.history.map((row) => (
                    <tr key={row.date} className="border-b border-border last:border-0">
                      <td className="px-5 py-3 font-medium text-foreground">
                        {row.label}
                      </td>
                      <td className="px-5 py-3 tabular-nums">{row.maximumMark}</td>
                      <td className="px-5 py-3 tabular-nums">
                        {row.averagePercentage}%
                      </td>
                      <td className="px-5 py-3 tabular-nums">{row.presentCount}</td>
                      <td className="px-5 py-3 tabular-nums">{row.absentCount}</td>
                      <td className="px-5 py-3 text-right">
                        <Link
                          href={`/teacher/groups/${groupId}/performance?date=${row.date}`}
                          className="font-medium text-primary hover:underline"
                        >
                          Open
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </TeacherGroupShell>
  );
}

