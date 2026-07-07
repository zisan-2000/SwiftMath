import { Skeleton } from "@/components/ui/skeleton";

/** Page title + subtitle placeholder. */
export function PageHeaderSkeleton({ hasActions = true }: { hasActions?: boolean }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 space-y-2">
        <Skeleton className="h-8 w-48 max-w-full" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      {hasActions ? (
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
        </div>
      ) : null}
    </div>
  );
}

/** Stat card row used on dashboards and detail pages. */
export function StatGridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="rounded-lg border border-border bg-card p-4"
        >
          <Skeleton className="h-4 w-20" />
          <Skeleton className="mt-3 h-7 w-16" />
        </div>
      ))}
    </div>
  );
}

/** Card with stacked list rows (groups, students, activity, etc.). */
export function CardListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="border-b border-border p-4">
        <Skeleton className="h-5 w-32" />
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className="flex items-center gap-4 p-4">
            <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/5" />
              <Skeleton className="h-3 w-2/5" />
            </div>
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Content-area skeleton without app chrome (for nested segments). */
export function AppContentSkeleton({
  statCount = 3,
  listRows = 4,
  showStats = true,
}: {
  statCount?: number;
  listRows?: number;
  showStats?: boolean;
}) {
  return (
    <div className="animate-in fade-in-50 duration-300">
      <PageHeaderSkeleton />
      {showStats ? <StatGridSkeleton count={statCount} /> : null}
      <CardListSkeleton rows={listRows} />
    </div>
  );
}

/**
 * Full-page skeleton mimicking the authenticated app shell during route
 * transitions. Keeps layout stable so navigation does not flash a blank screen.
 */
export function AppPageSkeleton() {
  return (
    <div
      className="flex min-h-svh"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading page"
    >
      <aside
        aria-hidden="true"
        className="sticky top-0 hidden h-svh w-64 shrink-0 flex-col border-r border-border/80 bg-card/75 lg:flex"
      >
        <div className="border-b border-border px-4 py-4">
          <Skeleton className="h-8 w-36" />
        </div>
        <div className="flex-1 space-y-2 p-3">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-9 w-full" />
          ))}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header
          aria-hidden="true"
          className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-border/80 bg-background/70 px-4 lg:px-8"
        >
          <Skeleton className="h-9 w-9 lg:hidden" />
          <Skeleton className="h-7 w-28 flex-1 lg:hidden" />
          <div className="ml-auto flex gap-2">
            <Skeleton className="h-9 w-9 rounded-md" />
            <Skeleton className="h-9 w-9 rounded-md" />
            <Skeleton className="h-9 w-9 rounded-full" />
          </div>
        </header>

        <main className="flex-1 px-4 py-8 lg:px-8">
          <div className="mx-auto w-full max-w-5xl">
            <AppContentSkeleton />
          </div>
        </main>
      </div>
    </div>
  );
}

/**
 * Sidebar-less skeleton matching the distraction-free practice/exam focus
 * shell, shown while a session route streams in.
 */
export function PracticeFocusSkeleton() {
  return (
    <div
      className="flex min-h-svh flex-col"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading practice"
    >
      <header
        aria-hidden="true"
        className="sticky top-0 z-30 border-b border-border/80 bg-background/70"
      >
        <div className="mx-auto flex h-16 w-full max-w-3xl items-center gap-3 px-4 lg:px-8">
          <Skeleton className="h-8 w-8 shrink-0 rounded-lg" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="ml-auto h-8 w-20" />
        </div>
      </header>

      <main className="flex-1 px-4 py-8 lg:px-8">
        <div className="mx-auto w-full max-w-3xl space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-8 w-56 max-w-full" />
            <Skeleton className="h-4 w-72 max-w-full" />
          </div>
          <div className="rounded-lg border border-border bg-card p-6">
            <Skeleton className="mx-auto h-10 w-40" />
            <Skeleton className="mx-auto mt-6 h-16 w-3/4" />
            <Skeleton className="mx-auto mt-6 h-11 w-48" />
          </div>
        </div>
      </main>
    </div>
  );
}
