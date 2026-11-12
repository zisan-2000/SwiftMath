import { Skeleton } from "@/components/ui/skeleton";

/** Match the dashboard composition rather than flashing a generic card grid. */
export function DashboardSkeleton({
  role,
}: {
  role: "admin" | "teacher" | "student";
}) {
  return (
    <div
      className="app-shell flex min-h-svh"
      role="status"
      aria-label="Loading your workspace"
      aria-busy="true"
    >
      <aside
        aria-hidden="true"
        className="app-sidebar hidden w-60 shrink-0 border-r border-border p-5 lg:block"
      >
        <Skeleton className="mb-12 h-9 w-36" />
        {Array.from({ length: 7 }, (_, i) => (
          <Skeleton key={i} className="mb-4 h-10 w-full" />
        ))}
      </aside>
      <div className="min-w-0 flex-1">
        <div
          aria-hidden="true"
          className="app-topbar flex h-[72px] items-center justify-between border-b border-border px-6"
        >
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-28" />
        </div>
        <div
          aria-hidden="true"
          className="dashboard-skeleton mx-auto max-w-7xl p-4 sm:p-6 lg:p-8"
        >
          <div className="flex justify-between gap-4">
            <div className="space-y-2">
              <Skeleton className="h-6 w-44 max-w-full" />
              <Skeleton className="h-4 w-52 max-w-full" />
            </div>
            <Skeleton className="h-8 w-20" />
          </div>
          <div className="dashboard-skeleton-hero">
            <div
              className={`rounded-2xl border border-border p-6 ${role === "admin" ? "bg-primary/8" : "bg-card"}`}
            >
              <Skeleton className="h-3 w-32" />
              <Skeleton className="mt-6 h-9 w-3/4" />
              <Skeleton className="mt-3 h-9 w-1/2" />
              <Skeleton className="mt-8 h-12 w-20" />
            </div>
            <div className="rounded-2xl border border-border bg-card p-6">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="mt-6 h-20 w-full" />
              <Skeleton className="mt-6 h-9 w-full" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 rounded-xl border border-border bg-card p-5 sm:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i}>
                <Skeleton className="h-3 w-20 max-w-full" />
                <Skeleton className="mt-4 h-8 w-16" />
              </div>
            ))}
          </div>
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
