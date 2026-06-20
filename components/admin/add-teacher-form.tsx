"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";

import {
  addTeacherAction,
  type AddTeacherState,
} from "@/app/admin/teachers/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormMessage } from "@/components/ui/form-message";

/** Form for an admin to create a teacher in their institute. */
export function AddTeacherForm() {
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
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Input name="name" placeholder="Full name" required />
        <Input
          name="email"
          type="email"
          placeholder="Email"
          autoComplete="off"
          required
        />
        <Input
          name="password"
          type="password"
          placeholder="Temporary password"
          autoComplete="new-password"
          minLength={8}
          required
        />
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
