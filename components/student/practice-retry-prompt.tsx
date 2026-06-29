import { RotateCcw } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

/** Encourages another attempt when a timed pass was not reached. */
export function PracticeRetryPrompt({
  headline,
  body,
}: {
  headline: string;
  body: string;
}) {
  return (
    <Card className="mb-6 border-warning/40 bg-warning/5">
      <CardContent className="flex items-start gap-3 p-5 text-left">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-warning/15 text-warning">
          <RotateCcw className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="font-semibold text-foreground">{headline}</p>
          <p className="mt-1 text-sm text-muted-foreground">{body}</p>
        </div>
      </CardContent>
    </Card>
  );
}
