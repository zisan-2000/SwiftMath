"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { submitSessionAction } from "@/app/student/practice/actions";
import { markFirstPracticeCompleted } from "@/lib/pwa";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

interface RunnerQuestion {
  id: string;
  index: number;
  prompt: string;
}

interface PracticeRunnerProps {
  sessionId: string;
  /** When false, no countdown or auto-submit (review mode). */
  timed: boolean;
  /** Server deadline (ISO). Ignored when `timed` is false. */
  expiresAt: string;
  questions: RunnerQuestion[];
}

function formatClock(totalSeconds: number): string {
  const s = Math.max(0, totalSeconds);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export function PracticeRunner({
  sessionId,
  timed,
  expiresAt,
  questions,
}: PracticeRunnerProps) {
  const router = useRouter();
  const deadline = new Date(expiresAt).getTime();

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [secondsLeft, setSecondsLeft] = useState(() =>
    timed ? Math.round((deadline - Date.now()) / 1000) : 0,
  );
  const [submitting, setSubmitting] = useState(false);
  const submittedRef = useRef(false);
  const tabBlurCountRef = useRef(0);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        tabBlurCountRef.current += 1;
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  const submit = useCallback(async () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);

    const payload = questions.map((q) => {
      const raw = answers[q.id];
      const value =
        raw !== undefined && raw.trim() !== "" ? Number(raw) : null;
      return {
        id: q.id,
        answer: value !== null && Number.isFinite(value) ? value : null,
      };
    });

    await submitSessionAction(sessionId, payload, {
      tabBlurCount: tabBlurCountRef.current,
    });
    markFirstPracticeCompleted();
    // The server flipped the session to COMPLETED/EXPIRED; re-render to results.
    router.refresh();
  }, [answers, questions, router, sessionId]);

  // Countdown; auto-submit when time runs out (timed sessions only).
  useEffect(() => {
    if (!timed) return;
    const tick = () => {
      const remaining = Math.round((deadline - Date.now()) / 1000);
      setSecondsLeft(remaining);
      if (remaining <= 0) submit();
    };
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadline, submit, timed]);

  const lowTime = timed && secondsLeft <= 10;

  return (
    <div>
      {timed && (
        <Card
          className={cn(
            "sticky top-16 z-10 mb-6 flex items-center justify-between px-5 py-3 transition-colors",
            lowTime && "border-destructive/40 bg-destructive/5",
          )}
        >
          <span className="text-sm text-muted-foreground">Time left</span>
          <span
            role="timer"
            aria-live={lowTime ? "assertive" : "polite"}
            aria-atomic="true"
            className={cn(
              "font-mono text-xl font-bold tabular-nums",
              lowTime ? "text-destructive" : "text-foreground",
            )}
          >
            {formatClock(secondsLeft)}
          </span>
        </Card>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <ol className="flex flex-col gap-3">
          {questions.map((q) => {
            const inputId = `answer-${q.id}`;
            return (
              <li key={q.id}>
                <Card className="flex flex-col gap-3 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <span className="min-w-0 wrap-break-word font-mono text-lg text-foreground">
                    <span className="mr-3 text-sm text-muted-foreground">
                      {q.index + 1}.
                    </span>
                    {q.prompt} =
                  </span>
                  <div className="flex shrink-0 flex-col gap-1.5 sm:items-end">
                    <Label htmlFor={inputId} className="sr-only">
                      Answer for question {q.index + 1}: {q.prompt}
                    </Label>
                    <input
                      id={inputId}
                      type="number"
                      inputMode="numeric"
                      value={answers[q.id] ?? ""}
                      disabled={submitting}
                      onChange={(e) =>
                        setAnswers((prev) => ({
                          ...prev,
                          [q.id]: e.target.value,
                        }))
                      }
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-right text-foreground shadow-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 sm:w-28"
                    />
                  </div>
                </Card>
              </li>
            );
          })}
        </ol>

        <div className="mt-6 flex justify-end">
          <Button
            type="submit"
            size="lg"
            disabled={submitting}
            className="w-full sm:w-auto"
          >
            {submitting ? "Submitting…" : "Submit answers"}
          </Button>
        </div>
      </form>
    </div>
  );
}
