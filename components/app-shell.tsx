import type { ReactNode } from "react";

import { APP_NAME } from "@/lib/constants";
import type { Role } from "@/lib/generated/prisma/enums";
import { SignOutButton } from "@/components/sign-out-button";

interface AppShellProps {
  /** The signed-in user, already fetched + authorised by the page. */
  user: { name: string; role: Role };
  /** Display name of the user's institute (white-label header). */
  instituteName: string;
  /** Page heading shown under the top bar. */
  title: string;
  /** Optional sub-heading / description for the page. */
  subtitle?: string;
  children: ReactNode;
}

/**
 * Shared chrome for every authenticated page: a top bar with the institute
 * brand and the current user, plus a titled content area. Presentational only
 * — pages do their own auth (requireRole) and pass the resulting user in.
 */
export function AppShell({
  user,
  instituteName,
  title,
  subtitle,
  children,
}: AppShellProps) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-50 font-sans dark:bg-black">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-6 py-4">
          <div className="min-w-0">
            <p className="truncate text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              {instituteName}
            </p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              {APP_NAME}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {user.name}
              </p>
              <p className="text-xs uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
                {user.role}
              </p>
            </div>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {subtitle}
            </p>
          )}
        </div>
        {children}
      </main>
    </div>
  );
}
