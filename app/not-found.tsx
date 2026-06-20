import Link from "next/link";

import { APP_NAME } from "@/lib/constants";

/**
 * Root 404 page. Shown when `notFound()` is called (e.g. an admin opens a level
 * id that isn't in their institute) or for unmatched routes. Kept self-contained
 * (no AppShell) since it can render outside an authenticated context.
 */
export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 font-sans dark:bg-black">
      <main className="flex w-full max-w-md flex-col items-center gap-4 text-center">
        <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
          404
        </span>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Page not found
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          The page you’re looking for doesn’t exist or you don’t have access to
          it.
        </p>
        <Link
          href="/dashboard"
          className="mt-2 rounded-lg bg-indigo-600 px-5 py-2.5 font-medium text-white transition-colors hover:bg-indigo-700"
        >
          Go to {APP_NAME}
        </Link>
      </main>
    </div>
  );
}
