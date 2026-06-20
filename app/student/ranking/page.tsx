import type { Metadata } from "next";

import { APP_NAME } from "@/lib/constants";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/generated/prisma/enums";
import { getInstituteLeaderboard } from "@/server/ranking";
import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = {
  title: `Ranking · ${APP_NAME}`,
};

export default async function StudentRankingPage() {
  const student = await requireRole(Role.STUDENT);

  const [institute, leaderboard] = await Promise.all([
    prisma.institute.findUnique({
      where: { id: student.instituteId },
      select: { name: true },
    }),
    getInstituteLeaderboard(student.instituteId),
  ]);

  const myRank = leaderboard.find((row) => row.studentId === student.id);

  return (
    <AppShell
      user={student}
      instituteName={institute?.name ?? "Institute"}
      title="Ranking"
      subtitle={
        myRank
          ? `You're ranked #${myRank.rank} of ${leaderboard.length}.`
          : "Institute leaderboard."
      }
    >
      {leaderboard.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-300 bg-white p-4 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-400">
          No students to rank yet.
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 text-left text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                <th className="px-4 py-3 font-medium">#</th>
                <th className="px-4 py-3 font-medium">Student</th>
                <th className="px-4 py-3 font-medium">Level</th>
                <th className="px-4 py-3 text-right font-medium">Passed</th>
                <th className="px-4 py-3 text-right font-medium">Avg. accuracy</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((row) => {
                const isMe = row.studentId === student.id;
                return (
                  <tr
                    key={row.studentId}
                    className={`border-b border-zinc-100 last:border-b-0 dark:border-zinc-800 ${
                      isMe
                        ? "bg-indigo-50 dark:bg-indigo-950/30"
                        : ""
                    }`}
                  >
                    <td className="px-4 py-3 font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                      {row.rank}
                    </td>
                    <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100">
                      {row.name}
                      {isMe && (
                        <span className="ml-2 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">
                          You
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {row.levelName ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-zinc-900 dark:text-zinc-100">
                      {row.passedCount}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-zinc-900 dark:text-zinc-100">
                      {row.avgAccuracy}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
