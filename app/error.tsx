"use client";

// Route-segment error boundary. Catches uncaught exceptions thrown while
// rendering a page/segment and shows a recoverable fallback instead of a blank
// crash. Error boundaries must be Client Components.
//
// Next.js 16 note: the recovery prop is `unstable_retry` (it replaced `reset`
// from earlier versions). It re-attempts rendering the failed segment.

import { useEffect } from "react";
import Link from "next/link";

export default function ErrorPage({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    // In production this is where an error-reporting service would be called.
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 font-sans dark:bg-black">
      <main className="flex w-full max-w-md flex-col items-center gap-4 text-center">
        <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-red-700 dark:bg-red-950 dark:text-red-300">
          Error
        </span>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Something went wrong
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          An unexpected error occurred. You can try again, or head back to your
          dashboard.
        </p>
        {error.digest && (
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            Reference: {error.digest}
          </p>
        )}
        <div className="mt-2 flex gap-3">
          <button
            type="button"
            onClick={() => unstable_retry()}
            className="rounded-lg bg-indigo-600 px-5 py-2.5 font-medium text-white transition-colors hover:bg-indigo-700"
          >
            Try again
          </button>
          <Link
            href="/dashboard"
            className="rounded-lg border border-zinc-300 px-5 py-2.5 font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            Dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}
