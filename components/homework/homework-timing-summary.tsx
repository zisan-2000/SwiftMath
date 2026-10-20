import { Clock3 } from "lucide-react";

import {
  formatDhakaTime,
  formatHomeworkDuration,
} from "@/lib/homework-presentation";

export function HomeworkTimingSummary({
  startedAt,
  submittedAt,
  completionSeconds,
}: {
  startedAt: Date | string;
  submittedAt: Date | string | null;
  completionSeconds: number | null;
}) {
  return (
    <div className="grid gap-2 rounded-lg border border-border/70 bg-muted/25 p-3 text-sm sm:grid-cols-3">
      <div>
        <p className="text-xs text-muted-foreground">First photo uploaded</p>
        <p className="mt-0.5 font-medium tabular-nums">{formatDhakaTime(startedAt)}</p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">Final photo uploaded</p>
        <p className="mt-0.5 font-medium tabular-nums">
          {submittedAt ? formatDhakaTime(submittedAt) : "Not uploaded yet"}
        </p>
      </div>
      <div>
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
          Total time
        </p>
        <p className="mt-0.5 font-medium tabular-nums">
          {completionSeconds == null
            ? "In progress"
            : formatHomeworkDuration(completionSeconds)}
        </p>
      </div>
    </div>
  );
}
