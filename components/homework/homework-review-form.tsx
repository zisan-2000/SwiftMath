"use client";

import { useActionState, useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { HomeworkSubmissionStatus } from "@/lib/generated/prisma/enums";

export interface HomeworkReviewState {
  ok?: boolean;
  message?: string;
  error?: string;
  expectedUpdatedAt?: string;
}

export type HomeworkReviewAction = (
  previousState: HomeworkReviewState,
  formData: FormData,
) => Promise<HomeworkReviewState>;

export function HomeworkReviewForm({
  action,
  hiddenFields,
  maxScore,
  initialScore,
  initialComment,
}: {
  action: HomeworkReviewAction;
  hiddenFields: Record<string, string>;
  maxScore: string;
  initialScore: string;
  initialComment: string;
}) {
  const [snapshotUpdatedAt] = useState(hiddenFields.expectedUpdatedAt);
  const [state, formAction, pending] = useActionState<HomeworkReviewState, FormData>(
    action,
    {},
  );
  const [decision, setDecision] = useState<HomeworkSubmissionStatus | null>(null);

  useEffect(() => {
    if (state.ok && state.message) {
      toast.success(state.message);
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state]);

  const pendingLabel = decision === HomeworkSubmissionStatus.APPROVED
    ? "Approving…"
    : decision === HomeworkSubmissionStatus.RESUBMISSION_REQUESTED
      ? "Requesting…"
      : decision === HomeworkSubmissionStatus.REJECTED
        ? "Rejecting…"
        : "Saving…";

  return (
    <form action={formAction} className="grid gap-3 rounded-lg border p-4 sm:grid-cols-3" aria-busy={pending}>
      {Object.entries(hiddenFields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={name === "expectedUpdatedAt" ? (state.expectedUpdatedAt ?? snapshotUpdatedAt) : value} />
      ))}
      <div className="space-y-2">
        <Label htmlFor={`score-${hiddenFields.submissionId}`}>Score / {maxScore}</Label>
        <Input
          id={`score-${hiddenFields.submissionId}`}
          name="score"
          type="number"
          min="0"
          max={maxScore}
          step="0.01"
          defaultValue={initialScore}
          disabled={pending}
        />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor={`comment-${hiddenFields.submissionId}`}>Comment</Label>
        <Textarea
          id={`comment-${hiddenFields.submissionId}`}
          name="comment"
          defaultValue={initialComment}
          disabled={pending}
        />
      </div>
      <div className="flex flex-wrap gap-2 sm:col-span-3">
        <Button
          type="submit"
          name="status"
          value={HomeworkSubmissionStatus.APPROVED}
          disabled={pending}
          onClick={() => setDecision(HomeworkSubmissionStatus.APPROVED)}
        >
          {pending && decision === HomeworkSubmissionStatus.APPROVED && <LoaderCircle className="animate-spin" aria-hidden="true" />}
          {pending && decision === HomeworkSubmissionStatus.APPROVED ? pendingLabel : "Approve"}
        </Button>
        <Button
          type="submit"
          name="status"
          value={HomeworkSubmissionStatus.RESUBMISSION_REQUESTED}
          variant="outline"
          disabled={pending}
          onClick={() => setDecision(HomeworkSubmissionStatus.RESUBMISSION_REQUESTED)}
        >
          {pending && decision === HomeworkSubmissionStatus.RESUBMISSION_REQUESTED && <LoaderCircle className="animate-spin" aria-hidden="true" />}
          {pending && decision === HomeworkSubmissionStatus.RESUBMISSION_REQUESTED ? pendingLabel : "Request resubmission"}
        </Button>
        <Button
          type="submit"
          name="status"
          value={HomeworkSubmissionStatus.REJECTED}
          variant="destructive"
          disabled={pending}
          onClick={() => setDecision(HomeworkSubmissionStatus.REJECTED)}
        >
          {pending && decision === HomeworkSubmissionStatus.REJECTED && <LoaderCircle className="animate-spin" aria-hidden="true" />}
          {pending && decision === HomeworkSubmissionStatus.REJECTED ? pendingLabel : "Reject"}
        </Button>
      </div>
      {pending && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground sm:col-span-3" role="status">
          <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
          {pendingLabel} Please wait.
        </p>
      )}
      {state.error && <div className="sm:col-span-3 space-y-2"><FormMessage variant="error">{state.error}</FormMessage><Button type="button" variant="outline" onClick={() => window.location.reload()}>Reload latest review</Button></div>}
      {state.ok && state.message && <FormMessage variant="success" className="sm:col-span-3">{state.message}</FormMessage>}
    </form>
  );
}
