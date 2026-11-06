"use client";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
export default function HomeworkPageError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(
      JSON.stringify({
        event: "homework-page-render",
        code: "RENDER_FAILED",
        digest: error.digest,
      }),
    );
  }, [error]);
  return (
    <div className="mx-auto max-w-md space-y-4 p-6">
      <h1 className="text-xl font-semibold">Could not refresh homework</h1>
      <p>
        Your photo may already be saved. Reload to check its status before
        choosing another photo.
      </p>
      {error.digest && <p className="text-xs">Reference: {error.digest}</p>}
      <Button onClick={() => unstable_retry()}>Reload homework status</Button>
      <p>
        <a className="underline" href="/student/homework">
          Open homework again
        </a>
      </p>
    </div>
  );
}
