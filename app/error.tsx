"use client";

// Route-segment error boundary. Catches uncaught exceptions thrown while
// rendering a page/segment and shows a recoverable fallback instead of a blank
// crash. Error boundaries must be Client Components.
//
// Next.js 16 note: the recovery prop is `unstable_retry` (it replaced `reset`
// from earlier versions). It re-attempts rendering the failed segment.

import { useEffect } from "react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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
    <div className="flex min-h-svh flex-1 flex-col items-center justify-center bg-background px-6">
      <main className="flex w-full max-w-md flex-col items-center gap-4 text-center">
        <Badge variant="destructive">Error</Badge>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Something went wrong
        </h1>
        <p className="text-muted-foreground">
          An unexpected error occurred. You can try again, or head back to your
          dashboard.
        </p>
        {error.digest && (
          <p className="text-xs text-muted-foreground/70">
            Reference: {error.digest}
          </p>
        )}
        <div className="mt-2 flex gap-3">
          <Button type="button" onClick={() => unstable_retry()}>
            Try again
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard">Dashboard</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
