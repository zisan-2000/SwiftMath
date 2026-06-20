"use client";

import { useActionState } from "react";

import { OperationType } from "@/lib/generated/prisma/enums";
import type { LevelFormState } from "@/app/admin/levels/actions";

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
}

interface LevelFormProps {
  action: LevelFormAction;
  submitLabel: string;
  defaults: LevelFormDefaults;
}

const inputClass =
  "rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-indigo-900";

const labelClass = "text-sm font-medium text-zinc-700 dark:text-zinc-300";

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
      <label htmlFor={name} className={labelClass}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        type="number"
        min={min}
        step={1}
        defaultValue={defaultValue}
        required
        className={inputClass}
      />
      {hint && (
        <span className="text-xs text-zinc-400 dark:text-zinc-500">{hint}</span>
      )}
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

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="name" className={labelClass}>
            Name
          </label>
          <input
            id="name"
            name="name"
            placeholder="e.g. Addition I"
            defaultValue={defaults.name}
            required
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="operation" className={labelClass}>
            Operation
          </label>
          <select
            id="operation"
            name="operation"
            defaultValue={defaults.operation}
            className={inputClass}
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

      {state.error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="text-sm text-green-600 dark:text-green-400">Saved.</p>
      )}

      <div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-indigo-600 px-5 py-2.5 font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-60"
        >
          {pending ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
