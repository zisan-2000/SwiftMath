import Link from "next/link";
import { ClipboardCheck } from "lucide-react";

import { cancelScheduledExamFormAction } from "@/app/teacher/groups/[groupId]/actions";
import {
  examDisplayTitle,
  examStatusBadgeVariant,
  examStatusLabel,
  formatExamWindow,
  resolveExamWindowStatus,
  type ScheduledExamListItem,
} from "@/lib/scheduled-exam-presentation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface TeacherScheduledExamsProps {
  exams: ScheduledExamListItem[];
  /** Wall-clock ms for exam window status (pass from server render). */
  nowMs: number;
  /** Table for cross-group roster; list for a single group tab. */
  layout?: "table" | "list";
  showGroup?: boolean;
  /** Required for list layout cancel actions when `showGroup` is false. */
  groupId?: string;
  emptyTitle?: string;
  emptyDescription?: string;
}

function resolveCancelGroupId(
  exam: ScheduledExamListItem,
  groupId?: string,
): string | null {
  return exam.group?.id ?? groupId ?? null;
}

/** Unified scheduled-exam list (group tab + cross-group exams page). */
export function TeacherScheduledExams({
  exams,
  nowMs,
  layout = "table",
  showGroup = false,
  groupId,
  emptyTitle = "No exams scheduled",
  emptyDescription = "Schedule an exam from a group’s Exams tab.",
}: TeacherScheduledExamsProps) {
  if (exams.length === 0) {
    return (
      <EmptyState
        icon={ClipboardCheck}
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  if (layout === "list") {
    return (
      <ul className="divide-y divide-border">
        {exams.map((exam) => {
          const status = resolveExamWindowStatus(exam.opensAt, exam.closesAt, nowMs);
          const cancelGroupId = resolveCancelGroupId(exam, groupId);
          const canCancel =
            status === "upcoming" &&
            exam.attemptCount === 0 &&
            cancelGroupId != null;

          return (
            <li
              key={exam.id}
              className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="min-w-0">
                <p className="font-medium text-foreground">
                  {examDisplayTitle(exam)}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {exam.level.name}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatExamWindow(exam.opensAt, exam.closesAt)}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:justify-end">
                <Badge variant={examStatusBadgeVariant(status)}>
                  {examStatusLabel(status)}
                </Badge>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {exam.paperQuestionCount}{" "}
                  {exam.paperQuestionCount === 1 ? "question" : "questions"}
                </span>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {exam.attemptCount}{" "}
                  {exam.attemptCount === 1 ? "attempt" : "attempts"}
                </span>
                {canCancel && (
                  <form action={cancelScheduledExamFormAction}>
                    <input type="hidden" name="groupId" value={cancelGroupId} />
                    <input type="hidden" name="scheduledExamId" value={exam.id} />
                    <Button type="submit" variant="outline" size="sm">
                      Cancel
                    </Button>
                  </form>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Exam</TableHead>
            {showGroup && <TableHead>Group</TableHead>}
            <TableHead>Window</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Attempts</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {exams.map((exam) => {
            const status = resolveExamWindowStatus(exam.opensAt, exam.closesAt, nowMs);
            const cancelGroupId = resolveCancelGroupId(exam, groupId);
            const canCancel =
              status === "upcoming" &&
              exam.attemptCount === 0 &&
              cancelGroupId != null;

            return (
              <TableRow key={exam.id}>
                <TableCell>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">
                      {examDisplayTitle(exam)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {exam.level.name} · {exam.paperQuestionCount} questions
                    </p>
                  </div>
                </TableCell>
                {showGroup && exam.group && (
                  <TableCell>
                    <Link
                      href={`/teacher/groups/${exam.group.id}/exams`}
                      className="text-sm text-primary hover:underline"
                    >
                      {exam.group.name}
                    </Link>
                  </TableCell>
                )}
                <TableCell className="text-sm text-muted-foreground">
                  {formatExamWindow(exam.opensAt, exam.closesAt)}
                </TableCell>
                <TableCell>
                  <Badge variant={examStatusBadgeVariant(status)}>
                    {examStatusLabel(status)}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {exam.attemptCount}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    {exam.group && (
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/teacher/groups/${exam.group.id}/exams`}>
                          Manage
                        </Link>
                      </Button>
                    )}
                    {canCancel && (
                      <form action={cancelScheduledExamFormAction}>
                        <input type="hidden" name="groupId" value={cancelGroupId} />
                        <input
                          type="hidden"
                          name="scheduledExamId"
                          value={exam.id}
                        />
                        <Button type="submit" variant="ghost" size="sm">
                          Cancel
                        </Button>
                      </form>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
