"use client";

import { LoaderCircle, UploadCloud } from "lucide-react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

export function HomeworkUploadSubmitButton({
  idleLabel,
  pendingLabel,
}: {
  idleLabel: string;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();

  return (
    <div className="grid w-fit max-w-full gap-2">
      <Button type="submit" disabled={pending} aria-disabled={pending}>
        {pending ? (
          <LoaderCircle className="animate-spin" aria-hidden="true" />
        ) : (
          <UploadCloud aria-hidden="true" />
        )}
        {pending ? pendingLabel : idleLabel}
      </Button>
      <div aria-live="polite" aria-atomic="true">
        {pending && (
          <div className="min-w-64 space-y-1.5 text-xs text-muted-foreground" role="status">
            <p>Uploading securely. Please wait and do not tap again.</p>
            <div
              className="h-1.5 overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-label="Photo upload in progress"
              aria-valuetext="Uploading"
            >
              <div className="h-full w-2/3 animate-pulse rounded-full bg-primary" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
