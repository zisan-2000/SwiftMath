"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormMessage } from "@/components/ui/form-message";

/** Shared shape returned by every reset-password server action. */
export interface ResetPasswordState {
  error?: string;
  ok?: boolean;
}

type ResetPasswordAction = (
  prevState: ResetPasswordState,
  formData: FormData,
) => Promise<ResetPasswordState>;

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

  // Collapse + clear after a successful reset; the toast carries the message.
  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      setOpen(false);
      toast.success("Password reset — the user must sign in again");
    }
  }, [state]);

  if (!open) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
      >
        <KeyRound className="h-4 w-4" />
        Reset password
      </Button>
    );
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex w-full max-w-xs flex-col gap-2 rounded-lg border border-border bg-muted/40 p-3"
    >
      <Input
        name="newPassword"
        type="password"
        placeholder="New password"
        autoComplete="new-password"
        minLength={8}
        required
        className="h-8 text-sm"
      />
      <Input
        name="confirmPassword"
        type="password"
        placeholder="Confirm new password"
        autoComplete="new-password"
        minLength={8}
        required
        className="h-8 text-sm"
      />

      {state.error && (
        <FormMessage variant="error" size="sm">
          {state.error}
        </FormMessage>
      )}

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setOpen(false)}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
