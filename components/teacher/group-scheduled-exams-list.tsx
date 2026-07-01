import { ClipboardCheck } from "lucide-react";

import { getExamWindowStatus } from "@/lib/exam-window";
import { cancelScheduledExamFormAction } from "@/app/teacher/groups/[groupId]/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export interface GroupScheduledExamRow {
  id: string;
  title: string | null;
  opensAt: Date;
  closesAt: Date;
  level: { name: string };
  attemptCount: number;
  paperQuestionCount: number;
}

interface GroupScheduledExamsListProps {
  groupId: string;
  exams: GroupScheduledExamRow[];
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

/** Scheduled exams for a teacher group, with cancel for upcoming zero-attempt exams. */
export function GroupScheduledExamsList({
  groupId,
  exams,
}: GroupScheduledExamsListProps) {
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
        const canCancel =
          status === "upcoming" && exam.attemptCount === 0;
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
                {exam.paperQuestionCount}{" "}
                {exam.paperQuestionCount === 1 ? "question" : "questions"} fixed
              </span>
              <span className="text-xs tabular-nums text-muted-foreground">
                {exam.attemptCount}{" "}
                {exam.attemptCount === 1 ? "attempt" : "attempts"}
              </span>
              {canCancel ? (
                <form action={cancelScheduledExamFormAction}>
                  <input type="hidden" name="groupId" value={groupId} />
                  <input
                    type="hidden"
                    name="scheduledExamId"
                    value={exam.id}
                  />
                  <Button type="submit" variant="outline" size="sm">
                    Cancel
                  </Button>
                </form>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
