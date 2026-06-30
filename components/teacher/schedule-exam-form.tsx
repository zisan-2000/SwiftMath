"use client";

import { useMemo } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";

import {
  createScheduledExamAction,
  type CreateScheduledExamState,
} from "@/app/teacher/groups/[groupId]/actions";
import { toDatetimeLocalValue } from "@/lib/scheduled-exam-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface LevelOption {
  id: string;
  orderIndex: number;
  name: string;
}

const SELECT_CLASS =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Scheduling…" : "Schedule exam"}
    </Button>
  );
}

/** Create a scheduled exam window for every student in the group. */
export function ScheduleExamForm({
  groupId,
  levels,
}: {
  groupId: string;
  levels: LevelOption[];
}) {
  const defaults = useMemo(() => {
    const opens = new Date();
    opens.setMinutes(0, 0, 0);
    const closes = new Date(opens.getTime() + 7 * 24 * 60 * 60 * 1000);
    return {
      opensAt: toDatetimeLocalValue(opens),
      closesAt: toDatetimeLocalValue(closes),
    };
  }, []);

  return (
    <form
      action={async (formData) => {
        const result: CreateScheduledExamState =
          await createScheduledExamAction(formData);
        if (result.error) {
          toast.error(result.error);
          return;
        }
        toast.success("Exam scheduled");
      }}
      className="flex flex-col gap-4"
    >
      <input type="hidden" name="groupId" value={groupId} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="exam-title">
            Title{" "}
            <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="exam-title"
            name="title"
            placeholder="Weekly test"
            maxLength={120}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="exam-level">Level</Label>
          <select
            id="exam-level"
            name="levelId"
            className={SELECT_CLASS}
            required
            defaultValue={levels[0]?.id ?? ""}
            disabled={levels.length === 0}
          >
            {levels.length === 0 ? (
              <option value="">No levels available</option>
            ) : (
              levels.map((level) => (
                <option key={level.id} value={level.id}>
                  {level.orderIndex}. {level.name}
                </option>
              ))
            )}
          </select>
        </div>

        <div className="hidden sm:block" aria-hidden="true" />

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="exam-opens">Opens</Label>
          <Input
            id="exam-opens"
            name="opensAt"
            type="datetime-local"
            required
            defaultValue={defaults.opensAt}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="exam-closes">Closes</Label>
          <Input
            id="exam-closes"
            name="closesAt"
            type="datetime-local"
            required
            defaultValue={defaults.closesAt}
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Students in this group can start one timed attempt while the window is
        open. Pass rules match standard practice for the chosen level.
      </p>

      <div>
        <SubmitButton />
      </div>
    </form>
  );
}
