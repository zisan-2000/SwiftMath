import type { Metadata } from "next";

import { APP_NAME } from "@/lib/constants";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Role, SessionStatus } from "@/lib/generated/prisma/enums";
import { listRecentSessions } from "@/server/practice";
import { AppShell } from "@/components/app-shell";
import { startSessionAction } from "./actions";

export const metadata: Metadata = {
  title: `Practice · ${APP_NAME}`,
};

export default async function PracticeHomePage() {
  const student = await requireRole(Role.STUDENT);

  const [profile, sessions] = await Promise.all([
    prisma.user.findUnique({
      where: { id: student.id },
      select: {
        institute: { select: { name: true } },
        currentLevel: {
          select: {
            name: true,
            questionCount: true,
            timeLimitSeconds: true,
            passAccuracy: true,
          },
        },
      },
    }),
    listRecentSessions(student.id),
  ]);

  const level = profile?.currentLevel;

  return (
    <AppShell
      user={student}
      instituteName={profile?.institute.name ?? "Institute"}
      title="Practice"
      subtitle="Timed practice at your current level."
    >
      {level ? (
        <div className="mb-8 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Current level
          </p>
          <h2 className="mt-1 text-xl font-bold text-zinc-900 dark:text-zinc-50">
            {level.name}
          </h2>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            {level.questionCount} questions · {level.timeLimitSeconds}s · pass at{" "}
            {level.passAccuracy}%
          </p>
          <form action={startSessionAction} className="mt-5">
            <button
              type="submit"
              className="rounded-lg bg-indigo-600 px-6 py-2.5 font-medium text-white transition-colors hover:bg-indigo-700"
            >
              Start practice
            </button>
          </form>
        </div>
      ) : (
        <p className="mb-8 rounded-xl border border-dashed border-zinc-300 bg-white p-4 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-400">
          Your teacher hasn&apos;t assigned a level yet. Check back soon.
        </p>
      )}

      {/* History */}
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Recent attempts
      </h2>
      {sessions.length === 0 ? (
        <p className="text-sm text-zinc-400 dark:text-zinc-500">
          No attempts yet.
        </p>
      ) : (
        <ul className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
          {sessions.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between border-b border-zinc-100 px-5 py-3 last:border-b-0 dark:border-zinc-800"
            >
              <div>
                <p className="font-medium text-zinc-900 dark:text-zinc-100">
                  {s.level.name}
                </p>
                <p className="text-xs text-zinc-400 dark:text-zinc-500">
                  {s.createdAt.toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                {s.status === SessionStatus.IN_PROGRESS ? (
                  <span className="text-sm text-amber-600 dark:text-amber-400">
                    In progress
                  </span>
                ) : (
                  <>
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {s.accuracy}%
                    </span>{" "}
                    <span
                      className={
                        s.passed
                          ? "text-sm text-green-600 dark:text-green-400"
                          : "text-sm text-zinc-400 dark:text-zinc-500"
                      }
                    >
                      {s.passed ? "Passed" : "Not passed"}
                    </span>
                    {s.leveledUp && (
                      <span className="ml-1 text-sm text-indigo-600 dark:text-indigo-400">
                        · Leveled up
                      </span>
                    )}
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
