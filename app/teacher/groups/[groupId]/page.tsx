import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { APP_NAME } from "@/lib/constants";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/generated/prisma/enums";
import { getTeacherGroup, listInstituteLevels } from "@/server/teacher";
import { AppShell } from "@/components/app-shell";
import { AddStudentForm } from "@/components/teacher/add-student-form";
import { assignLevelAction } from "./actions";

export const metadata: Metadata = {
  title: `Group · ${APP_NAME}`,
};

export default async function GroupDetailPage({
  params,
}: {
  // Next.js 16: route params are async.
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const teacher = await requireRole(Role.TEACHER);

  // Scoped lookup — null if the group isn't this teacher's.
  const group = await getTeacherGroup(teacher, groupId);
  if (!group) {
    notFound();
  }

  const [institute, levels] = await Promise.all([
    prisma.institute.findUnique({
      where: { id: teacher.instituteId },
      select: { name: true },
    }),
    listInstituteLevels(teacher.instituteId),
  ]);

  return (
    <AppShell
      user={teacher}
      instituteName={institute?.name ?? "Institute"}
      title={group.name}
      subtitle="Students in this group and their assigned level."
    >
      <Link
        href="/teacher/groups"
        className="mb-6 inline-block text-sm text-indigo-600 hover:underline dark:text-indigo-400"
      >
        ← All groups
      </Link>

      {/* Students */}
      <section className="mb-8 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="border-b border-zinc-100 px-5 py-3 dark:border-zinc-800">
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
            Students ({group.students.length})
          </h2>
        </div>

        {group.students.length === 0 ? (
          <p className="px-5 py-6 text-sm text-zinc-500 dark:text-zinc-400">
            No students yet. Add one below.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {group.students.map((student) => (
              <li
                key={student.id}
                className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-zinc-900 dark:text-zinc-100">
                    {student.name}
                  </p>
                  <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">
                    {student.email}
                  </p>
                </div>

                {/* Assign / change level */}
                <form
                  action={assignLevelAction}
                  className="flex items-center gap-2"
                >
                  <input type="hidden" name="groupId" value={group.id} />
                  <input type="hidden" name="studentId" value={student.id} />
                  <select
                    name="levelId"
                    defaultValue={student.currentLevelId ?? ""}
                    className="rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  >
                    <option value="">— No level —</option>
                    {levels.map((level) => (
                      <option key={level.id} value={level.id}>
                        {level.orderIndex}. {level.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
                  >
                    Save
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      {levels.length === 0 && (
        <p className="mb-8 rounded-xl border border-dashed border-amber-300 bg-amber-50 p-4 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
          No levels exist for your institute yet, so the level menu is empty.
          Levels are seeded in a later task.
        </p>
      )}

      {/* Add a student */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="mb-4 font-semibold text-zinc-900 dark:text-zinc-100">
          Add a student
        </h2>
        <AddStudentForm groupId={group.id} />
      </section>
    </AppShell>
  );
}
