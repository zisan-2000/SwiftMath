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

const SELECT_CLASS =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring";

interface TeacherOption {
  id: string;
  name: string;
  email: string;
}

/** Form for an admin to create a group assigned to a teacher. */
export function CreateGroupForm({
  teachers,
  onSuccess,
}: {
  teachers: TeacherOption[];
  onSuccess?: () => void;
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
    <form action={formAction} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="admin-group-name">Group name</Label>
        <Input
          id="admin-group-name"
          name="name"
          placeholder="e.g. Monday Beginners"
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="admin-group-teacher">Teacher</Label>
        <select
          id="admin-group-teacher"
          name="teacherId"
          className={SELECT_CLASS}
          required
          defaultValue=""
        >
          <option value="" disabled>
            Choose a teacher…
          </option>
          {teachers.map((teacher) => (
            <option key={teacher.id} value={teacher.id}>
              {teacher.name} ({teacher.email})
            </option>
          ))}
        </select>
      </div>

      {state.error && <FormMessage variant="error">{state.error}</FormMessage>}

      <Button type="submit" disabled={pending || teachers.length === 0}>
        {pending ? "Creating…" : "Create group"}
      </Button>
    </form>
  );
}
