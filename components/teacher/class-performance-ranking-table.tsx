"use client";

import Link from "next/link";

import type { ClassPerformanceRankingRow } from "@/lib/class-performance";
import {
  StudentSearch,
  useStudentSearch,
} from "@/components/ui/student-search";

export function ClassPerformanceRankingTable({
  groupId,
  rows,
}: {
  groupId: string;
  rows: ClassPerformanceRankingRow[];
}) {
  const { query, setQuery, filteredStudents } = useStudentSearch(rows);

  return (
    <>
      <div className="border-b border-border p-4">
        <StudentSearch
          id="class-performance-ranking-search"
          query={query}
          onQueryChange={setQuery}
          resultCount={filteredStudents.length}
          totalCount={rows.length}
        />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-muted-foreground">
              <th className="px-5 py-3 font-medium">Rank</th>
              <th className="px-5 py-3 font-medium">Student</th>
              <th className="px-5 py-3 font-medium">Performance</th>
              <th className="px-5 py-3 font-medium">Marks</th>
              <th className="px-5 py-3 font-medium">Classes</th>
              <th className="px-5 py-3 font-medium">Present</th>
              <th className="px-5 py-3 font-medium">Absent</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map((row) => (
              <tr
                key={row.studentId}
                className="border-b border-border last:border-0"
              >
                <td className="px-5 py-3 font-semibold tabular-nums">
                  #{row.rank}
                </td>
                <td className="px-5 py-3">
                  <Link
                    href={`/teacher/groups/${groupId}/students/${row.studentId}`}
                    className="font-medium text-foreground hover:text-primary hover:underline"
                  >
                    {row.name}
                  </Link>
                </td>
                <td className="px-5 py-3 font-semibold tabular-nums text-primary">
                  {row.percentage}%
                </td>
                <td className="px-5 py-3 tabular-nums">
                  {row.totalMark}/{row.totalMaximumMark}
                </td>
                <td className="px-5 py-3 tabular-nums">{row.classCount}</td>
                <td className="px-5 py-3 tabular-nums">{row.presentCount}</td>
                <td className="px-5 py-3 tabular-nums">{row.absentCount}</td>
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
    </>
  );
}
