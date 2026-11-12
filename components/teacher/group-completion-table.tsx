import { Users } from "lucide-react";
import type { GroupCompletionRow } from "@/lib/group-completion";
import { EmptyState } from "@/components/ui/empty-state";
import {
  DashboardLink,
  DashboardProgress,
} from "@/components/dashboard/dashboard-primitives";

/** A responsive group breakdown with no page-wide table overflow on mobile. */
export function GroupCompletionTable({ rows }: { rows: GroupCompletionRow[] }) {
  if (!rows.length)
    return (
      <EmptyState
        icon={Users}
        title="No assigned groups yet"
        description="Your institute admin can assign a teaching group to get you started."
        className="py-8"
      />
    );
  return (
    <div className="teacher-group-list">
      {rows.map((row) => (
        <article className="teacher-group-row" key={row.groupId}>
          <div className="min-w-0">
            <h3 className="break-words text-sm font-semibold">
              {row.groupName}
            </h3>
            <p className="dashboard-caption mt-1">
              {row.studentCount} students · {row.activeStudents} active ·{" "}
              {row.sessions} sessions
            </p>
          </div>
          <div>
            <div className="mb-2 flex flex-wrap justify-between gap-2 text-xs">
              <span className="text-muted-foreground">
                Students with a pass
              </span>
              <strong className="font-medium tabular-nums">
                {row.studentsPassed}/{row.studentCount} ·{" "}
                {row.studentCompletionRate}%
              </strong>
            </div>
            <DashboardProgress
              value={row.studentCompletionRate}
              label={`Student completion for ${row.groupName}`}
            />
            <p className="dashboard-caption mt-2">
              Attempt pass rate: {row.attemptCompletionRate}%
            </p>
          </div>
          <DashboardLink href={`/teacher/groups/${row.groupId}/analytics`}>
            View progress
          </DashboardLink>
        </article>
      ))}
      <p className="dashboard-caption mt-2">
        Student completion counts enrolled students with at least one pass.
        Attempt pass rate counts passed finished attempts. Last 7 days.
      </p>
    </div>
  );
}
