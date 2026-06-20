"use client";

import { useActionState, useEffect, useRef, useState } from "react";

/** Shared shape returned by every reset-password server action. */
export interface ResetPasswordState {
  error?: string;
  ok?: boolean;
}

type ResetPasswordAction = (
  prevState: ResetPasswordState,
  formData: FormData,
) => Promise<ResetPasswordState>;

const inputClass =
  "rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-indigo-900";

/**
 * Compact, toggleable "reset password" control for a single user. The page
 * passes a server action already bound to the target user's id. Used by staff
 * (admin/teacher) flows — there is no current-password field because the actor
 * is a trusted operator, not the account owner.
 */
export function ResetPasswordForm({ action }: { action: ResetPasswordAction }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<
    ResetPasswordState,
    FormData
  >(action, {});
  const formRef = useRef<HTMLFormElement>(null);

  // Collapse + clear shortly after a successful reset.
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
      >
        Reset password
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/40"
    >
      <input
        name="newPassword"
        type="password"
        placeholder="New password"
        autoComplete="new-password"
        minLength={8}
        required
        className={inputClass}
      />
      <input
        name="confirmPassword"
        type="password"
        placeholder="Confirm new password"
        autoComplete="new-password"
        minLength={8}
        required
        className={inputClass}
      />

      {state.error && (
        <p role="alert" className="text-xs text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="text-xs text-green-600 dark:text-green-400">
          Password reset. The user must sign in again.
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-900"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
