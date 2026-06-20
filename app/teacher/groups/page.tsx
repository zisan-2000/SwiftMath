import type { Metadata } from "next";
import Link from "next/link";

import { APP_NAME } from "@/lib/constants";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/generated/prisma/enums";
import { listTeacherGroups } from "@/server/teacher";
import { AppShell } from "@/components/app-shell";
import { createGroupAction } from "./actions";

export const metadata: Metadata = {
  title: `Groups · ${APP_NAME}`,
};

export default async function TeacherGroupsPage() {
  const teacher = await requireRole(Role.TEACHER);

  const [institute, groups] = await Promise.all([
    prisma.institute.findUnique({
      where: { id: teacher.instituteId },
      select: { name: true },
    }),
    listTeacherGroups(teacher.id),
  ]);

  return (
    <AppShell
      user={teacher}
      instituteName={institute?.name ?? "Institute"}
      title="Groups"
      subtitle="Create groups and manage the students in them."
    >
      {/* Create a new group */}
      <form
        action={createGroupAction}
        className="mb-8 flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950 sm:flex-row sm:items-end"
      >
        <div className="flex flex-1 flex-col gap-1.5">
          <label
            htmlFor="name"
            className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            New group name
          </label>
          <input
            id="name"
            name="name"
            required
            placeholder="e.g. Monday Beginners"
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-indigo-900"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition-colors hover:bg-indigo-700"
        >
          Create group
        </button>
      </form>

      {/* Existing groups */}
      {groups.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-300 bg-white p-4 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-400">
          No groups yet. Create your first group above.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {groups.map((group) => (
            <li key={group.id}>
              <Link
                href={`/teacher/groups/${group.id}`}
                className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white p-5 transition-colors hover:border-indigo-300 hover:bg-indigo-50/40 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-indigo-800 dark:hover:bg-indigo-950/20"
              >
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  {group.name}
                </span>
                <span className="text-sm text-zinc-500 dark:text-zinc-400">
                  {group._count.students}{" "}
                  {group._count.students === 1 ? "student" : "students"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
