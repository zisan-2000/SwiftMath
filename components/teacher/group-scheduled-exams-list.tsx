import { ClipboardCheck } from "lucide-react";

import { getExamWindowStatus } from "@/lib/exam-window";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

export interface GroupScheduledExamRow {
  id: string;
  title: string | null;
  opensAt: Date;
  closesAt: Date;
  level: { name: string };
  attemptCount: number;
}

function formatWindow(opensAt: Date, closesAt: Date): string {
  const opts: Intl.DateTimeFormatOptions = {
    dateStyle: "medium",
    timeStyle: "short",
  };
  return `${opensAt.toLocaleString(undefined, opts)} → ${closesAt.toLocaleString(undefined, opts)}`;
}

function statusBadgeVariant(
  status: ReturnType<typeof getExamWindowStatus>,
): "success" | "secondary" | "muted" {
  if (status === "open") return "success";
  if (status === "upcoming") return "secondary";
  return "muted";
}

function statusLabel(status: ReturnType<typeof getExamWindowStatus>): string {
  if (status === "open") return "Open";
  if (status === "upcoming") return "Upcoming";
  return "Closed";
}

/** Read-only list of scheduled exams for a teacher group. */
export function GroupScheduledExamsList({
  exams,
}: {
  exams: GroupScheduledExamRow[];
}) {
  const nowMs = Date.now();

  if (exams.length === 0) {
    return (
      <EmptyState
        icon={ClipboardCheck}
        title="No exams scheduled"
        description="Schedule an exam window so students see it on their dashboard."
      />
    );
  }

  return (
    <ul className="divide-y divide-border">
      {exams.map((exam) => {
        const status = getExamWindowStatus(nowMs, exam.opensAt, exam.closesAt);
        return (
          <li
            key={exam.id}
            className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-start sm:justify-between"
          >
            <div className="min-w-0">
              <p className="font-medium text-foreground">
                {exam.title ?? "Scheduled exam"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {exam.level.name}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatWindow(exam.opensAt, exam.closesAt)}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:justify-end">
              <Badge variant={statusBadgeVariant(status)}>{statusLabel(status)}</Badge>
              <span className="text-xs tabular-nums text-muted-foreground">
                {exam.attemptCount}{" "}
                {exam.attemptCount === 1 ? "attempt" : "attempts"}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
