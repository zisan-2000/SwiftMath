import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { APP_NAME } from "@/lib/constants";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Role, SessionStatus } from "@/lib/generated/prisma/enums";
import { getStudentProgress, listTeacherGroups } from "@/server/teacher";
import { AppShell } from "@/components/app-shell";
import { StatCard } from "@/components/stat-card";
import { moveStudentAction } from "./actions";

export const metadata: Metadata = {
  title: `Student progress · ${APP_NAME}`,
};

export default async function StudentProgressPage({
  params,
}: {
  // Next.js 16: route params are async.
  params: Promise<{ groupId: string; studentId: string }>;
}) {
  const { groupId, studentId } = await params;
  const teacher = await requireRole(Role.TEACHER);

  const [institute, progress, groups] = await Promise.all([
    prisma.institute.findUnique({
      where: { id: teacher.instituteId },
      select: { name: true },
    }),
    getStudentProgress(teacher, groupId, studentId),
    listTeacherGroups(teacher.id),
  ]);

  if (!progress) {
    notFound();
  }

  const { student, recentSessions, stats } = progress;

  // Other groups this teacher owns, available as move targets.
  const otherGroups = groups.filter((g) => g.id !== groupId);

  return (
    <AppShell
      user={teacher}
      instituteName={institute?.name ?? "Institute"}
      title={student.name}
      subtitle={student.email}
    >
      <Link
        href={`/teacher/groups/${groupId}`}
        className="mb-6 inline-block text-sm text-indigo-600 hover:underline dark:text-indigo-400"
      >
        ← Back to group
      </Link>

      {/* Headline stats */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard
          label="Current level"
          value={
            student.currentLevel
              ? `${student.currentLevel.orderIndex}. ${student.currentLevel.name}`
              : "Not assigned"
          }
        />
        <StatCard label="Attempts" value={stats.completed} hint="Finished" />
        <StatCard label="Passed" value={stats.passedCount} />
        <StatCard label="Avg. accuracy" value={`${stats.avgAccuracy}%`} />
        <StatCard label="Best accuracy" value={`${stats.bestAccuracy}%`} />
      </div>

      {stats.leveledUpCount > 0 && (
        <p className="mb-8 rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/30 dark:text-indigo-300">
          Leveled up {stats.leveledUpCount}{" "}
          {stats.leveledUpCount === 1 ? "time" : "times"} so far. 🎉
        </p>
      )}

      {/* Recent attempts */}
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Recent attempts
      </h2>
      {recentSessions.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-300 bg-white p-4 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-400">
          This student hasn’t practised yet.
        </p>
      ) : (
        <ul className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
          {recentSessions.map((s) => (
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
                    <span className="text-xs text-zinc-400 dark:text-zinc-500">
                      ({s.correctCount}/{s.totalQuestions})
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
                    {s.status === SessionStatus.EXPIRED && (
                      <span className="ml-1 text-sm text-amber-600 dark:text-amber-400">
                        · Expired
                      </span>
                    )}
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

      {/* Move to another group */}
      {otherGroups.length > 0 && (
        <section className="mt-8 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="mb-1 font-semibold text-zinc-900 dark:text-zinc-100">
            Move to another group
          </h2>
          <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
            Reassign this student to one of your other groups. Their level and
            history are kept.
          </p>
          <form
            action={moveStudentAction}
            className="flex flex-col gap-2 sm:flex-row sm:items-center"
          >
            <input type="hidden" name="studentId" value={student.id} />
            <input type="hidden" name="currentGroupId" value={groupId} />
            <select
              name="targetGroupId"
              defaultValue=""
              required
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            >
              <option value="" disabled>
                Choose a group…
              </option>
              {otherGroups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              Move student
            </button>
          </form>
        </section>
      )}
    </AppShell>
  );
}
