"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import {
  updateTeacherAction,
  type EditTeacherState,
} from "@/app/admin/teachers/[teacherId]/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormMessage } from "@/components/ui/form-message";

/** Form for an admin to edit a teacher's name and email. */
export function EditTeacherForm({
  teacherId,
  defaultName,
  defaultEmail,
}: {
  teacherId: string;
  defaultName: string;
  defaultEmail: string;
}) {
  const [state, formAction, pending] = useActionState<
    EditTeacherState,
    FormData
  >(updateTeacherAction.bind(null, teacherId), {});

  useEffect(() => {
    if (state.ok) {
      toast.success("Teacher updated");
    }
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="edit-teacher-name">Full name</Label>
        <Input
          id="edit-teacher-name"
          name="name"
          defaultValue={defaultName}
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="edit-teacher-email">Email</Label>
        <Input
          id="edit-teacher-email"
          name="email"
          type="email"
          defaultValue={defaultEmail}
          autoComplete="off"
          required
        />
      </div>

      {state.error && <FormMessage variant="error">{state.error}</FormMessage>}

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
