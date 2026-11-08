"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import {
  createGroupAction,
  type CreateGroupState,
} from "@/app/admin/groups/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormMessage } from "@/components/ui/form-message";

import {
  TeacherAssignmentPicker,
  type TeacherOption,
} from "@/components/admin/teacher-assignment-picker";

/** Form for an admin to create a group assigned to a teacher. */
export function CreateGroupForm({
  teachers,
  onSuccess,
  canAssign = true,
}: {
  teachers: TeacherOption[];
  onSuccess?: () => void;
  canAssign?: boolean;
}) {
  const [state, formAction, pending] = useActionState<
    CreateGroupState,
    FormData
  >(createGroupAction, {});

  useEffect(() => {
    if (state.ok) {
      toast.success("Group created");
      onSuccess?.();
    }
  }, [state, onSuccess]);

  return (
    <form action={formAction}>
      <fieldset disabled={pending} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="admin-group-name">Group name</Label>
          <Input
            id="admin-group-name"
            name="name"
            placeholder="e.g. Monday Beginners"
            required
          />
        </div>

        <TeacherAssignmentPicker teachers={teachers} readOnly={!canAssign} />

        {state.error && (
          <FormMessage variant="error">{state.error}</FormMessage>
        )}

        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create group"}
        </Button>
      </fieldset>
    </form>
  );
}
