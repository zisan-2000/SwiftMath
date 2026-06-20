import { Loader2 } from "lucide-react";

/**
 * Root loading fallback. Shown via Suspense during navigation while a Server
 * Component segment streams in (e.g. the dashboards wait on DB queries).
 */
export default function Loading() {
  return (
    <div className="flex min-h-svh flex-1 items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
        <span className="text-sm text-muted-foreground">Loading…</span>
      </div>
    </div>
  );
}
