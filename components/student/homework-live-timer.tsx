"use client";

import { useEffect, useState } from "react";
import { Clock3 } from "lucide-react";

import { formatElapsedTime } from "@/lib/homework-presentation";

export function HomeworkLiveTimer({
  startedAt,
  initialElapsedSeconds,
}: {
  startedAt: string;
  initialElapsedSeconds: number;
}) {
  const [elapsedSeconds, setElapsedSeconds] = useState(initialElapsedSeconds);

  useEffect(() => {
    const mountedAt = performance.now();
    const update = () => {
      const secondsSinceHydration = Math.floor((performance.now() - mountedAt) / 1_000);
      setElapsedSeconds(initialElapsedSeconds + secondsSinceHydration);
    };
    const interval = window.setInterval(update, 1_000);
    return () => window.clearInterval(interval);
  }, [initialElapsedSeconds, startedAt]);

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
      <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Clock3 className="h-4 w-4" aria-hidden="true" />
        Elapsed Time
      </p>
      <p className="mt-1 font-mono text-2xl font-semibold tabular-nums" aria-live="off">
        {formatElapsedTime(elapsedSeconds)}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Final completion time is calculated from server timestamps.
      </p>
    </div>
  );
}
