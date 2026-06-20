"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { submitSessionAction } from "@/app/student/practice/actions";

interface RunnerQuestion {
  id: string;
  index: number;
  prompt: string;
}

interface PracticeRunnerProps {
  sessionId: string;
  /** Server deadline (ISO). The server re-checks this on submit. */
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
  expiresAt,
  questions,
}: PracticeRunnerProps) {
  const router = useRouter();
  const deadline = new Date(expiresAt).getTime();

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [secondsLeft, setSecondsLeft] = useState(() =>
    Math.round((deadline - Date.now()) / 1000),
  );
  const [submitting, setSubmitting] = useState(false);
  const submittedRef = useRef(false);

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

    await submitSessionAction(sessionId, payload);
    // The server flipped the session to COMPLETED/EXPIRED; re-render to results.
    router.refresh();
  }, [answers, questions, router, sessionId]);

  // Countdown; auto-submit when time runs out.
  useEffect(() => {
    const tick = () => {
      const remaining = Math.round((deadline - Date.now()) / 1000);
      setSecondsLeft(remaining);
      if (remaining <= 0) submit();
    };
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadline, submit]);

  const lowTime = secondsLeft <= 10;

  return (
    <div>
      {/* Sticky timer */}
      <div className="sticky top-0 z-10 mb-6 flex items-center justify-between rounded-2xl border border-zinc-200 bg-white px-5 py-3 dark:border-zinc-800 dark:bg-zinc-950">
        <span className="text-sm text-zinc-500 dark:text-zinc-400">
          Time left
        </span>
        <span
          className={`font-mono text-xl font-bold tabular-nums ${
            lowTime
              ? "text-red-600 dark:text-red-400"
              : "text-zinc-900 dark:text-zinc-100"
          }`}
        >
          {formatClock(secondsLeft)}
        </span>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <ol className="flex flex-col gap-3">
          {questions.map((q) => (
            <li
              key={q.id}
              className="flex items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-white px-5 py-3 dark:border-zinc-800 dark:bg-zinc-950"
            >
              <span className="font-mono text-lg text-zinc-900 dark:text-zinc-100">
                <span className="mr-3 text-sm text-zinc-400">{q.index + 1}.</span>
                {q.prompt} =
              </span>
              <input
                type="number"
                inputMode="numeric"
                value={answers[q.id] ?? ""}
                disabled={submitting}
                onChange={(e) =>
                  setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                }
                className="w-28 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-right text-zinc-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-indigo-900"
              />
            </li>
          ))}
        </ol>

        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-indigo-600 px-6 py-2.5 font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-60"
          >
            {submitting ? "Submitting…" : "Submit answers"}
          </button>
        </div>
      </form>
    </div>
  );
}
