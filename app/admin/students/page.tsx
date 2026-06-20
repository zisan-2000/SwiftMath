import type { Metadata } from "next";
import Link from "next/link";

import { APP_NAME } from "@/lib/constants";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/generated/prisma/enums";
import { listInstituteStudents } from "@/server/admin";
import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = {
  title: `Students · ${APP_NAME}`,
};

/**
 * ADMIN → students. A read-only, institute-wide roster: who's enrolled, which
 * group they're in, and what level they're on. Adding students and assigning
 * levels stays with teachers (scoped to their own groups).
 */
export default async function AdminStudentsPage() {
  const admin = await requireRole(Role.ADMIN);

  const [institute, students] = await Promise.all([
    prisma.institute.findUnique({
      where: { id: admin.instituteId },
      select: { name: true },
    }),
    listInstituteStudents(admin.instituteId),
  ]);

  return (
    <AppShell
      user={admin}
      instituteName={institute?.name ?? "Institute"}
      title="Students"
      subtitle="Everyone enrolled across your institute."
    >
      <Link
        href="/admin"
        className="mb-6 inline-block text-sm text-indigo-600 hover:underline dark:text-indigo-400"
      >
        ← Admin dashboard
      </Link>

      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="border-b border-zinc-100 px-5 py-3 dark:border-zinc-800">
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
            All students ({students.length})
          </h2>
        </div>

        {students.length === 0 ? (
          <p className="px-5 py-6 text-sm text-zinc-500 dark:text-zinc-400">
            No students yet. Teachers add students within their groups.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 text-left text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Group</th>
                  <th className="px-4 py-3 font-medium">Current level</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr
                    key={student.id}
                    className="border-b border-zinc-100 last:border-b-0 dark:border-zinc-800"
                  >
                    <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100">
                      {student.name}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {student.email}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {student.group?.name ?? (
                        <span className="text-zinc-400 dark:text-zinc-500">
                          — Unassigned
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {student.currentLevel ? (
                        <>
                          <span className="tabular-nums text-zinc-400 dark:text-zinc-500">
                            {student.currentLevel.orderIndex}.
                          </span>{" "}
                          {student.currentLevel.name}
                        </>
                      ) : (
                        <span className="text-zinc-400 dark:text-zinc-500">
                          — Not assigned
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AppShell>
  );
}
