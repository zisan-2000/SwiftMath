"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";

import {
  addStudentAction,
  type AddStudentState,
} from "@/app/teacher/groups/[groupId]/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { FormMessage } from "@/components/ui/form-message";

/** Form for a teacher to create a student and add them to this group. */
export function AddStudentForm({
  groupId,
  onSuccess,
}: {
  groupId: string;
  onSuccess?: () => void;
}) {
  const [state, formAction, pending] = useActionState<
    AddStudentState,
    FormData
  >(addStudentAction, {});

  const formRef = useRef<HTMLFormElement>(null);

  // Clear the fields after a successful add (the list re-renders separately).
  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      toast.success("Student added");
      onSuccess?.();
    }
  }, [state, onSuccess]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="groupId" value={groupId} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="student-name">Full name</Label>
          <Input
            id="student-name"
            name="name"
            placeholder="Jane Doe"
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="student-email">Email</Label>
          <Input
            id="student-email"
            name="email"
            type="email"
            placeholder="jane@institute.test"
            autoComplete="off"
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="student-password">Temporary password</Label>
          <PasswordInput
            id="student-password"
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
          {pending ? "Adding…" : "Add student"}
        </Button>
      </div>
    </form>
  );
}
