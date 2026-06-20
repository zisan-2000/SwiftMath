import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { APP_NAME } from "@/lib/constants";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Role, SessionStatus } from "@/lib/generated/prisma/enums";
import { getStudentSession } from "@/server/practice";
import { AppShell } from "@/components/app-shell";
import { PracticeRunner } from "@/components/student/practice-runner";
import { startSessionAction } from "../actions";

export const metadata: Metadata = {
  title: `Practice session · ${APP_NAME}`,
};

export default async function PracticeSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const student = await requireRole(Role.STUDENT);

  const [session, institute] = await Promise.all([
    getStudentSession(student.id, sessionId),
    prisma.institute.findUnique({
      where: { id: student.instituteId },
      select: { name: true },
    }),
  ]);

  if (!session) {
    notFound();
  }

  const instituteName = institute?.name ?? "Institute";

  // --- In progress: run the timed test (no correct answers sent to client) ---
  if (session.status === SessionStatus.IN_PROGRESS) {
    const safeQuestions = session.questions.map((q) => ({
      id: q.id,
      index: q.index,
      prompt: q.prompt,
    }));

    return (
      <AppShell
        user={student}
        instituteName={instituteName}
        title={session.level.name}
        subtitle="Answer as many as you can before time runs out."
      >
        <PracticeRunner
          sessionId={session.id}
          expiresAt={session.expiresAt.toISOString()}
          questions={safeQuestions}
        />
      </AppShell>
    );
  }

  // --- Finished: show the result + per-question review ---
  const expired = session.status === SessionStatus.EXPIRED;

  return (
    <AppShell
      user={student}
      instituteName={instituteName}
      title="Results"
      subtitle={session.level.name}
    >
      <div className="mb-8 rounded-2xl border border-zinc-200 bg-white p-6 text-center dark:border-zinc-800 dark:bg-zinc-950">
        <p className="text-5xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          {session.accuracy}%
        </p>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          {session.correctCount} of {session.totalQuestions} correct · pass at{" "}
          {session.level.passAccuracy}%
        </p>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {expired && (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
              Time expired
            </span>
          )}
          <span
            className={`rounded-full px-3 py-1 text-sm font-medium ${
              session.passed
                ? "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400"
                : "bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400"
            }`}
          >
            {session.passed ? "Passed" : "Not passed"}
          </span>
          {session.leveledUp && (
            <span className="rounded-full bg-indigo-100 px-3 py-1 text-sm font-medium text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
              Leveled up! 🎉
            </span>
          )}
        </div>

        <div className="mt-6 flex justify-center gap-3">
          <form action={startSessionAction}>
            <button
              type="submit"
              className="rounded-lg bg-indigo-600 px-5 py-2.5 font-medium text-white transition-colors hover:bg-indigo-700"
            >
              Practice again
            </button>
          </form>
          <Link
            href="/student/practice"
            className="rounded-lg border border-zinc-300 px-5 py-2.5 font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            Back
          </Link>
        </div>
      </div>

      {/* Per-question review */}
      <ol className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        {session.questions.map((q) => (
          <li
            key={q.id}
            className="flex items-center justify-between gap-4 border-b border-zinc-100 px-5 py-3 last:border-b-0 dark:border-zinc-800"
          >
            <span className="font-mono text-zinc-900 dark:text-zinc-100">
              <span className="mr-3 text-sm text-zinc-400">{q.index + 1}.</span>
              {q.prompt} = {q.correctAnswer}
            </span>
            <span className="flex items-center gap-3 text-sm">
              <span className="text-zinc-500 dark:text-zinc-400">
                your answer:{" "}
                {q.studentAnswer === null ? "—" : q.studentAnswer}
              </span>
              <span
                className={
                  q.isCorrect
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                }
              >
                {q.isCorrect ? "✓" : "✗"}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </AppShell>
  );
}
