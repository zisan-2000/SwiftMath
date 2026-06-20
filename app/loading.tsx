/**
 * Root loading fallback. Shown via Suspense during navigation while a Server
 * Component segment streams in (e.g. the dashboards wait on DB queries).
 */
export default function Loading() {
  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <div className="flex flex-col items-center gap-3">
        <span
          className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-indigo-600 dark:border-zinc-700 dark:border-t-indigo-400"
          aria-hidden="true"
        />
        <span className="text-sm text-zinc-500 dark:text-zinc-400">
          Loading…
        </span>
      </div>
    </div>
  );
}
