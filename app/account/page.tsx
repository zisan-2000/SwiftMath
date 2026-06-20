import type { Metadata } from "next";

import { APP_NAME } from "@/lib/constants";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/app-shell";
import { ChangePasswordForm } from "@/components/account/change-password-form";

export const metadata: Metadata = {
  title: `Account · ${APP_NAME}`,
};

/**
 * Account settings, available to every signed-in user regardless of role.
 * Phase 1 scope: change your own password.
 */
export default async function AccountPage() {
  const user = await requireUser();

  const institute = await prisma.institute.findUnique({
    where: { id: user.instituteId },
    select: { name: true },
  });

  return (
    <AppShell
      user={user}
      instituteName={institute?.name ?? "Institute"}
      title="Account"
      subtitle="Manage your sign-in details."
    >
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Name</p>
          <p className="mt-1 font-medium text-zinc-900 dark:text-zinc-100">
            {user.name}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Email</p>
          <p className="mt-1 font-medium text-zinc-900 dark:text-zinc-100">
            {user.email}
          </p>
        </div>
      </div>

      <section className="max-w-md rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="mb-4 font-semibold text-zinc-900 dark:text-zinc-100">
          Change password
        </h2>
        <ChangePasswordForm />
      </section>
    </AppShell>
  );
}
