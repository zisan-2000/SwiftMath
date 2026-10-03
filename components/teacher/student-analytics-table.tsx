"use client";

import Link from "next/link";

import type { GroupStudentPracticeSummary } from "@/lib/group-analytics";
import { formatSpeedDuration } from "@/lib/practice-speed";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  StudentSearch,
  useStudentSearch,
} from "@/components/ui/student-search";

export function StudentAnalyticsTable({
  groupId,
  rows,
}: {
  groupId: string;
  rows: GroupStudentPracticeSummary[];
}) {
  const { query, setQuery, filteredStudents } = useStudentSearch(rows);

  return (
    <Card>
      <CardHeader className="border-b border-border">
        <CardTitle className="text-base">Last 7 days</CardTitle>
        <StudentSearch
          id="student-analytics-search"
          query={query}
          onQueryChange={setQuery}
          resultCount={filteredStudents.length}
          totalCount={rows.length}
        />
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-muted-foreground">
                <th className="px-5 py-2.5 font-medium">Student</th>
                <th className="px-5 py-2.5 font-medium">Sessions</th>
                <th className="px-5 py-2.5 font-medium">Completion</th>
                <th className="px-5 py-2.5 font-medium">Avg accuracy</th>
                <th className="px-5 py-2.5 font-medium">Fastest pass</th>
                <th className="px-5 py-2.5 font-medium">Avg pass time</th>
                <th className="px-5 py-2.5 font-medium">Retries</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((row) => (
                <tr
                  key={row.studentId}
                  className="border-b border-border last:border-0"
                >
                  <td className="px-5 py-3 align-middle">
                    <Link
                      href={`/teacher/groups/${groupId}/students/${row.studentId}`}
                      className="font-medium text-foreground transition-colors hover:text-primary hover:underline"
                    >
                      {row.name}
                    </Link>
                  </td>
                  <td className="px-5 py-3 align-middle tabular-nums">
                    {row.sessions}
                  </td>
                  <td className="px-5 py-3 align-middle tabular-nums">
                    {row.passRate}%
                  </td>
                  <td className="px-5 py-3 align-middle tabular-nums">
                    {row.avgAccuracy}%
                  </td>
                  <td className="px-5 py-3 align-middle tabular-nums">
                    {formatSpeedDuration(row.fastestPassMs)}
                  </td>
                  <td className="px-5 py-3 align-middle tabular-nums">
                    {formatSpeedDuration(row.avgPassMs)}
                  </td>
                  <td className="px-5 py-3 align-middle tabular-nums">
                    {row.retries}
                  </td>
                </tr>
              ))}
              {filteredStudents.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-8 text-center text-muted-foreground"
                  >
                    No students match “{query.trim()}”.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
