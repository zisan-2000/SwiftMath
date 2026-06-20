"use client";

import { useActionState, useEffect, useRef } from "react";

import {
  addStudentAction,
  type AddStudentState,
} from "@/app/teacher/groups/[groupId]/actions";

const inputClass =
  "rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-indigo-900";

/** Form for a teacher to create a student and add them to this group. */
export function AddStudentForm({ groupId }: { groupId: string }) {
  const [state, formAction, pending] = useActionState<
    AddStudentState,
    FormData
  >(addStudentAction, {});

  const formRef = useRef<HTMLFormElement>(null);

  // Clear the fields after a successful add (the list re-renders separately).
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="groupId" value={groupId} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <input
          name="name"
          placeholder="Full name"
          required
          className={inputClass}
        />
        <input
          name="email"
          type="email"
          placeholder="Email"
          autoComplete="off"
          required
          className={inputClass}
        />
        <input
          name="password"
          type="password"
          placeholder="Temporary password"
          autoComplete="new-password"
          minLength={8}
          required
          className={inputClass}
        />
      </div>

      {state.error && (
        <p
          role="alert"
          className="text-sm text-red-600 dark:text-red-400"
        >
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="text-sm text-green-600 dark:text-green-400">
          Student added.
        </p>
      )}

      <div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-60"
        >
          {pending ? "Adding…" : "Add student"}
        </button>
      </div>
    </form>
  );
}
