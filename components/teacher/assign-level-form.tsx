"use client";

import { useFormStatus } from "react-dom";
import { toast } from "sonner";

import { assignLevelAction } from "@/app/teacher/groups/[groupId]/actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface LevelOption {
  id: string;
  orderIndex: number;
  name: string;
}

/** Native <select> styled to match the Input component. */
const SELECT_CLASS =
  "h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="outline" size="sm" disabled={pending}>
      {pending ? "Saving…" : "Save"}
    </Button>
  );
}

/**
 * Assign or clear a student's current level. Wraps the server action so we can
 * pop a toast once the (revalidating) action resolves — the row updates in
 * place, so a transient confirmation is the right feedback.
 */
export function AssignLevelForm({
  groupId,
  studentId,
  currentLevelId,
  levels,
}: {
  groupId: string;
  studentId: string;
  currentLevelId: string | null;
  levels: LevelOption[];
}) {
  const selectId = `level-${studentId}`;

  return (
    <form
      action={async (formData) => {
        const result = await assignLevelAction(formData);
        if (result.error) {
          toast.error(result.error);
          return;
        }
        toast.success("Level updated");
      }}
      className="flex flex-col gap-2 sm:flex-row sm:items-end"
    >
      <input type="hidden" name="groupId" value={groupId} />
      <input type="hidden" name="studentId" value={studentId} />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={selectId} className="sr-only">
          Assigned level
        </Label>
        <select
          id={selectId}
          name="levelId"
          defaultValue={currentLevelId ?? ""}
          className={SELECT_CLASS}
          aria-label="Assigned level"
        >
          <option value="">— No level —</option>
          {levels.map((level) => (
            <option key={level.id} value={level.id}>
              {level.orderIndex}. {level.name}
            </option>
          ))}
        </select>
      </div>
      <SaveButton />
    </form>
  );
}
