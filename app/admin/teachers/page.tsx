import type { Metadata } from "next";
import Link from "next/link";

import { APP_NAME } from "@/lib/constants";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/generated/prisma/enums";
import { listInstituteTeachers } from "@/server/admin";
import { AppShell } from "@/components/app-shell";
import { AddTeacherForm } from "@/components/admin/add-teacher-form";

export const metadata: Metadata = {
  title: `Teachers · ${APP_NAME}`,
};

/**
 * ADMIN → teachers. Lists every teacher in the admin's institute and provides
 * the only Phase 1 way to provision a new teacher account (public sign-up is
 * disabled).
 */
export default async function AdminTeachersPage() {
  const admin = await requireRole(Role.ADMIN);

  const [institute, teachers] = await Promise.all([
    prisma.institute.findUnique({
      where: { id: admin.instituteId },
      select: { name: true },
    }),
    listInstituteTeachers(admin.instituteId),
  ]);

  return (
    <AppShell
      user={admin}
      instituteName={institute?.name ?? "Institute"}
      title="Teachers"
      subtitle="Create teacher accounts and see who teaches in your institute."
    >
      <Link
        href="/admin"
        className="mb-6 inline-block text-sm text-indigo-600 hover:underline dark:text-indigo-400"
      >
        ← Admin dashboard
      </Link>

      {/* Existing teachers */}
      <section className="mb-8 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="border-b border-zinc-100 px-5 py-3 dark:border-zinc-800">
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
            All teachers ({teachers.length})
          </h2>
        </div>

        {teachers.length === 0 ? (
          <p className="px-5 py-6 text-sm text-zinc-500 dark:text-zinc-400">
            No teachers yet. Add one below.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {teachers.map((teacher) => (
              <li
                key={teacher.id}
                className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-zinc-900 dark:text-zinc-100">
                    {teacher.name}
                  </p>
                  <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">
                    {teacher.email}
                  </p>
                </div>
                <span className="text-sm text-zinc-500 dark:text-zinc-400">
                  {teacher._count.taughtGroups}{" "}
                  {teacher._count.taughtGroups === 1 ? "group" : "groups"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Add a teacher */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="mb-4 font-semibold text-zinc-900 dark:text-zinc-100">
          Add a teacher
        </h2>
        <AddTeacherForm />
      </section>
    </AppShell>
  );
}
