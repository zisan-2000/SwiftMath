import type { Metadata } from "next";
import Link from "next/link";

import { APP_NAME } from "@/lib/constants";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Role, OperationType } from "@/lib/generated/prisma/enums";
import { listLevels } from "@/server/admin";
import { AppShell } from "@/components/app-shell";
import { LevelForm } from "@/components/admin/level-form";
import { createLevelAction } from "./actions";

export const metadata: Metadata = {
  title: `Levels · ${APP_NAME}`,
};

/** Short symbol per operation for the compact table. */
const OPERATION_SYMBOL: Record<OperationType, string> = {
  [OperationType.ADDITION]: "+",
  [OperationType.SUBTRACTION]: "−",
  [OperationType.MULTIPLICATION]: "×",
  [OperationType.DIVISION]: "÷",
  [OperationType.MIXED]: "+ / −",
};

/**
 * ADMIN → levels. Lists the institute's practice curriculum and lets the admin
 * add a new level. Editing a level lives on its own page.
 */
export default async function AdminLevelsPage() {
  const admin = await requireRole(Role.ADMIN);

  const [institute, levels] = await Promise.all([
    prisma.institute.findUnique({
      where: { id: admin.instituteId },
      select: { name: true },
    }),
    listLevels(admin.instituteId),
  ]);

  // Suggest the next free order position so the create form is one click away.
  const nextOrder =
    levels.reduce((max, l) => Math.max(max, l.orderIndex), 0) + 1;

  return (
    <AppShell
      user={admin}
      instituteName={institute?.name ?? "Institute"}
      title="Levels"
      subtitle="The practice curriculum students progress through."
    >
      <Link
        href="/admin"
        className="mb-6 inline-block text-sm text-indigo-600 hover:underline dark:text-indigo-400"
      >
        ← Admin dashboard
      </Link>

      {/* Existing levels */}
      <section className="mb-8 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="border-b border-zinc-100 px-5 py-3 dark:border-zinc-800">
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
            All levels ({levels.length})
          </h2>
        </div>

        {levels.length === 0 ? (
          <p className="px-5 py-6 text-sm text-zinc-500 dark:text-zinc-400">
            No levels yet. Add your first level below.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 text-left text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                  <th className="px-4 py-3 font-medium">#</th>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Op</th>
                  <th className="px-4 py-3 text-right font-medium">Terms</th>
                  <th className="px-4 py-3 text-right font-medium">Range</th>
                  <th className="px-4 py-3 text-right font-medium">Qs</th>
                  <th className="px-4 py-3 text-right font-medium">Time</th>
                  <th className="px-4 py-3 text-right font-medium">Pass</th>
                  <th className="px-4 py-3 text-right font-medium">Students</th>
                  <th className="px-4 py-3 text-right font-medium" />
                </tr>
              </thead>
              <tbody>
                {levels.map((level) => (
                  <tr
                    key={level.id}
                    className="border-b border-zinc-100 last:border-b-0 dark:border-zinc-800"
                  >
                    <td className="px-4 py-3 font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                      {level.orderIndex}
                    </td>
                    <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100">
                      {level.name}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {OPERATION_SYMBOL[level.operation]}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-zinc-600 dark:text-zinc-400">
                      {level.termsPerQuestion}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-zinc-600 dark:text-zinc-400">
                      {level.minNumber}–{level.maxNumber}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-zinc-600 dark:text-zinc-400">
                      {level.questionCount}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-zinc-600 dark:text-zinc-400">
                      {level.timeLimitSeconds}s
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-zinc-600 dark:text-zinc-400">
                      {level.passAccuracy}%
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-zinc-600 dark:text-zinc-400">
                      {level._count.studentsOnLevel}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/levels/${level.id}`}
                        className="text-indigo-600 hover:underline dark:text-indigo-400"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Add a level */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="mb-4 font-semibold text-zinc-900 dark:text-zinc-100">
          Add a level
        </h2>
        <LevelForm
          action={createLevelAction}
          submitLabel="Create level"
          defaults={{
            name: "",
            operation: OperationType.ADDITION,
            orderIndex: nextOrder,
            termsPerQuestion: 2,
            minNumber: 1,
            maxNumber: 9,
            questionCount: 10,
            timeLimitSeconds: 120,
            passAccuracy: 70,
          }}
        />
      </section>
    </AppShell>
  );
}
