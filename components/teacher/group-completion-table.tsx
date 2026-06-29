import Link from "next/link";

import type { GroupCompletionRow } from "@/lib/group-completion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

/** Per-group completion breakdown for the teacher dashboard (4.7). */
export function GroupCompletionTable({
  rows,
}: {
  rows: GroupCompletionRow[];
}) {
  if (rows.length === 0) {
    return (
      <EmptyState
        title="No groups yet"
        description="Create a group to track completion rates here."
      />
    );
  }

  return (
    <Card>
      <CardHeader className="border-b border-border">
        <CardTitle className="text-base">Completion by group</CardTitle>
        <p className="text-sm text-muted-foreground">
          Student completion = share of enrolled students with at least one pass.
          Attempt completion = share of finished attempts that passed.
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-muted-foreground">
                <th className="px-5 py-2.5 font-medium">Group</th>
                <th className="px-5 py-2.5 font-medium">Students</th>
                <th className="px-5 py-2.5 font-medium">Active</th>
                <th className="px-5 py-2.5 font-medium">Student completion</th>
                <th className="px-5 py-2.5 font-medium">Attempt completion</th>
                <th className="px-5 py-2.5 font-medium">Sessions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.groupId}
                  className="border-b border-border last:border-0"
                >
                  <td className="px-5 py-3 align-middle">
                    <Link
                      href={`/teacher/groups/${row.groupId}/analytics`}
                      className="font-medium text-foreground transition-colors hover:text-primary hover:underline"
                    >
                      {row.groupName}
                    </Link>
                  </td>
                  <td className="px-5 py-3 align-middle tabular-nums">
                    {row.studentCount}
                  </td>
                  <td className="px-5 py-3 align-middle tabular-nums">
                    {row.activeStudents}
                  </td>
                  <td className="px-5 py-3 align-middle tabular-nums">
                    {row.studentCompletionRate}%
                    <span className="ml-1 text-xs text-muted-foreground">
                      ({row.studentsPassed}/{row.studentCount})
                    </span>
                  </td>
                  <td className="px-5 py-3 align-middle tabular-nums">
                    {row.attemptCompletionRate}%
                  </td>
                  <td className="px-5 py-3 align-middle tabular-nums">
                    {row.sessions}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
