"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { OperationType } from "@/lib/generated/prisma/enums";
import type { LevelFormState } from "@/app/admin/levels/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormMessage } from "@/components/ui/form-message";

/** The server action shape both create and (bound) update conform to. */
type LevelFormAction = (
  prevState: LevelFormState,
  formData: FormData,
) => Promise<LevelFormState>;

export interface LevelFormDefaults {
  name: string;
  orderIndex: number | string;
  operation: OperationType;
  termsPerQuestion: number | string;
  minNumber: number | string;
  maxNumber: number | string;
  questionCount: number | string;
  timeLimitSeconds: number | string;
  passAccuracy: number | string;
  requiresPreviousPass: boolean;
  bankOnly: boolean;
}

interface LevelFormProps {
  action: LevelFormAction;
  submitLabel: string;
  defaults: LevelFormDefaults;
}

/** Native <select> styled to match the Input component. */
const SELECT_CLASS =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50";

/** Human labels for each operation in the select. */
const OPERATION_LABELS: Record<OperationType, string> = {
  [OperationType.ADDITION]: "Addition (+)",
  [OperationType.SUBTRACTION]: "Subtraction (−)",
  [OperationType.MULTIPLICATION]: "Multiplication (×)",
  [OperationType.DIVISION]: "Division (÷)",
  [OperationType.MIXED]: "Mixed (+ / −)",
};

/** A labelled numeric field. */
function NumberField({
  name,
  label,
  defaultValue,
  hint,
  min,
}: {
  name: string;
  label: string;
  defaultValue: number | string;
  hint?: string;
  min?: number;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        type="number"
        min={min}
        step={1}
        defaultValue={defaultValue}
        required
      />
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </div>
  );
}

/**
 * Create/edit form for a practice level. The same component powers both: the
 * page passes the appropriate server action and default values. The server
 * re-validates everything — these inputs are just for convenience.
 */
export function LevelForm({ action, submitLabel, defaults }: LevelFormProps) {
  const [state, formAction, pending] = useActionState<
    LevelFormState,
    FormData
  >(action, {});

  // Create redirects on success; edit returns { ok } in place, so toast there.
  useEffect(() => {
    if (state.ok) toast.success("Level saved");
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            name="name"
            placeholder="e.g. Addition I"
            defaultValue={defaults.name}
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="operation">Operation</Label>
          <select
            id="operation"
            name="operation"
            defaultValue={defaults.operation}
            className={SELECT_CLASS}
          >
            {Object.values(OperationType).map((op) => (
              <option key={op} value={op}>
                {OPERATION_LABELS[op]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <NumberField
          name="orderIndex"
          label="Order"
          defaultValue={defaults.orderIndex}
          min={1}
          hint="Position in progression"
        />
        <NumberField
          name="termsPerQuestion"
          label="Terms / question"
          defaultValue={defaults.termsPerQuestion}
          min={2}
          hint="e.g. 3 → a + b + c"
        />
        <NumberField
          name="questionCount"
          label="Questions"
          defaultValue={defaults.questionCount}
          min={1}
        />
        <NumberField
          name="minNumber"
          label="Min number"
          defaultValue={defaults.minNumber}
        />
        <NumberField
          name="maxNumber"
          label="Max number"
          defaultValue={defaults.maxNumber}
        />
        <NumberField
          name="timeLimitSeconds"
          label="Time limit (s)"
          defaultValue={defaults.timeLimitSeconds}
          min={1}
        />
        <NumberField
          name="passAccuracy"
          label="Pass accuracy (%)"
          defaultValue={defaults.passAccuracy}
          min={0}
          hint="0–100"
        />
      </div>

      <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-4">
        <input type="hidden" name="bankOnly" value="off" />
        <input
          id="bankOnly"
          name="bankOnly"
          type="checkbox"
          value="on"
          defaultChecked={defaults.bankOnly}
          className="mt-1 h-4 w-4 rounded border-input"
        />
        <div className="flex flex-col gap-1">
          <Label htmlFor="bankOnly" className="font-medium">
            Bank-only mode
          </Label>
          <p className="text-sm text-muted-foreground">
            When enabled, sessions use only fixed bank questions — no dynamic
            generation. Practice and exams are blocked until the active bank
            covers the session size (including teacher group disables).
          </p>
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-4">
        <input type="hidden" name="requiresPreviousPass" value="off" />
        <input
          id="requiresPreviousPass"
          name="requiresPreviousPass"
          type="checkbox"
          value="on"
          defaultChecked={defaults.requiresPreviousPass}
          className="mt-1 h-4 w-4 rounded border-input"
        />
        <div className="flex flex-col gap-1">
          <Label htmlFor="requiresPreviousPass" className="font-medium">
            Require previous level pass
          </Label>
          <p className="text-sm text-muted-foreground">
            When enabled, students must pass the level before this one (by order)
            before they can practise or be assigned here. Level 1 is always open.
          </p>
        </div>
      </div>

      {state.error && <FormMessage variant="error">{state.error}</FormMessage>}

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
