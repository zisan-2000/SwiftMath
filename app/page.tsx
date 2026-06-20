import Link from "next/link";

import { APP_NAME, APP_TAGLINE } from "@/lib/constants";

/**
 * Public landing page.
 *
 * Phase 1: a simple branded placeholder with a route into the app. Role-based
 * dashboards are fleshed out in a later task.
 */
export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 font-sans dark:bg-black">
      <main className="flex w-full max-w-xl flex-col items-center gap-6 text-center">
        <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
          Phase 1 · MVP
        </span>

        <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          {APP_NAME}
        </h1>

        <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
          {APP_TAGLINE}
        </p>

        <Link
          href="/login"
          className="mt-2 rounded-lg bg-indigo-600 px-5 py-2.5 font-medium text-white transition-colors hover:bg-indigo-700"
        >
          Sign in
        </Link>
      </main>
    </div>
  );
}
