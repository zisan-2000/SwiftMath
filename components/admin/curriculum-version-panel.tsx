"use client";

import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { GitBranch } from "lucide-react";

import {
  bumpCurriculumVersionAction,
  type BumpCurriculumVersionState,
} from "@/app/admin/settings/actions";
import { formatCurriculumVersionLabel } from "@/lib/curriculum-version";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface CurriculumVersionSummary {
  versionNumber: number;
  label: string | null;
  publishedAt: Date;
  liveQuestionCount: number;
}

export interface CurriculumVersionHistoryRow {
  versionNumber: number;
  label: string | null;
  publishedAt: Date;
  questionCount: number;
}

function BumpButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Starting…" : "Start new version"}
    </Button>
  );
}

/** Admin controls for curriculum generation / question-bank versioning. */
export function CurriculumVersionPanel({
  active,
  history,
}: {
  active: CurriculumVersionSummary;
  history: CurriculumVersionHistoryRow[];
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border border-border bg-muted/30 p-4">
        <p className="text-sm font-medium text-foreground">
          {formatCurriculumVersionLabel(active)}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {active.liveQuestionCount} published active question
          {active.liveQuestionCount === 1 ? "" : "s"} in the live generation.
          New practice and exams stamp this version; older published rows stay
          for audit but are not picked.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Active since{" "}
          {active.publishedAt.toLocaleString(undefined, {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </p>
      </div>

      <form
        action={async (formData) => {
          const result: BumpCurriculumVersionState =
            await bumpCurriculumVersionAction(formData);
          if (result.error) {
            toast.error(result.error);
            return;
          }
          toast.success(
            `Started ${formatCurriculumVersionLabel({
              versionNumber: result.versionNumber!,
              label: result.label,
            })}`,
          );
        }}
        className="flex flex-col gap-3"
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="curriculum-version-label">
            Note{" "}
            <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="curriculum-version-label"
            name="label"
            placeholder="Term 2 refresh"
            maxLength={80}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Starting a new version clears the live bank until you publish questions
          into the new generation. Draft rows are unaffected.
        </p>
        <BumpButton />
      </form>

      {history.length > 1 && (
        <div>
          <p className="mb-2 text-sm font-medium text-foreground">
            Recent versions
          </p>
          <ul className="divide-y divide-border rounded-lg border border-border">
            {history.map((row) => (
              <li
                key={row.versionNumber}
                className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
              >
                <span>
                  {formatCurriculumVersionLabel(row)}
                  {row.versionNumber === active.versionNumber && (
                    <span className="ml-2 text-xs text-success">Active</span>
                  )}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {row.questionCount} question
                  {row.questionCount === 1 ? "" : "s"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Compact banner for the question bank page. */
export function ActiveCurriculumVersionBanner({
  active,
  className,
}: {
  active: CurriculumVersionSummary;
  className?: string;
}) {
  return (
    <div
      className={`flex gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm${className ? ` ${className}` : ""}`}
    >
      <GitBranch className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      <div>
        <p className="font-medium text-foreground">
          Live generation: {formatCurriculumVersionLabel(active)}
        </p>
        <p className="mt-1 text-muted-foreground">
          Only published questions in this version are used in practice and
          exams. Publish drafts or start a new version from Settings.
        </p>
      </div>
    </div>
  );
}
