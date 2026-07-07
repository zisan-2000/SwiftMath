"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";

import {
  addTeacherAction,
  type AddTeacherState,
} from "@/app/admin/teachers/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { FormMessage } from "@/components/ui/form-message";

/** Form for an admin to create a teacher in their institute. */
export function AddTeacherForm({ onSuccess }: { onSuccess?: () => void }) {
  const [state, formAction, pending] = useActionState<
    AddTeacherState,
    FormData
  >(addTeacherAction, {});

  const formRef = useRef<HTMLFormElement>(null);

  // Clear the fields after a successful add (the list re-renders separately).
  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      toast.success("Teacher added");
      onSuccess?.();
    }
  }, [state, onSuccess]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="teacher-name">Full name</Label>
          <Input
            id="teacher-name"
            name="name"
            placeholder="Jane Doe"
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="teacher-email">Email</Label>
          <Input
            id="teacher-email"
            name="email"
            type="email"
            placeholder="jane@institute.test"
            autoComplete="off"
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="teacher-password">Temporary password</Label>
          <PasswordInput
            id="teacher-password"
            name="password"
            placeholder="Min. 8 characters"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </div>
      </div>

      {state.error && <FormMessage variant="error">{state.error}</FormMessage>}

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Adding…" : "Add teacher"}
        </Button>
      </div>
    </form>
  );
}
