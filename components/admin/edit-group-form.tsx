"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import {
  updateGroupAction,
  type EditGroupState,
} from "@/app/admin/groups/[groupId]/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormMessage } from "@/components/ui/form-message";

const SELECT_CLASS =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring";

interface TeacherOption {
  id: string;
  name: string;
  email: string;
}

/** Form for an admin to rename a group or change its teacher. */
export function EditGroupForm({
  groupId,
  defaultName,
  defaultTeacherId,
  teachers,
}: {
  groupId: string;
  defaultName: string;
  defaultTeacherId: string;
  teachers: TeacherOption[];
}) {
  const [state, formAction, pending] = useActionState<
    EditGroupState,
    FormData
  >(updateGroupAction.bind(null, groupId), {});

  useEffect(() => {
    if (state.ok) {
      toast.success("Group updated");
    }
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="edit-group-name">Group name</Label>
        <Input
          id="edit-group-name"
          name="name"
          defaultValue={defaultName}
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="edit-group-teacher">Teacher</Label>
        <select
          id="edit-group-teacher"
          name="teacherId"
          className={SELECT_CLASS}
          required
          defaultValue={defaultTeacherId}
        >
          {teachers.map((teacher) => (
            <option key={teacher.id} value={teacher.id}>
              {teacher.name} ({teacher.email})
            </option>
          ))}
        </select>
      </div>

      {state.error && <FormMessage variant="error">{state.error}</FormMessage>}

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
