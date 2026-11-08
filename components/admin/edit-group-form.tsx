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

import {
  TeacherAssignmentPicker,
  type TeacherOption,
} from "@/components/admin/teacher-assignment-picker";

/** Form for an admin to rename a group or change its teacher. */
export function EditGroupForm({
  groupId,
  defaultName,
  defaultTeacherIds,
  defaultRevision,
  canAssign = true,
  canManage = true,
  teachers,
}: {
  groupId: string;
  defaultName: string;
  defaultTeacherIds: string[];
  defaultRevision: number;
  canAssign?: boolean;
  canManage?: boolean;
  teachers: TeacherOption[];
}) {
  const [state, formAction, pending] = useActionState<EditGroupState, FormData>(
    updateGroupAction.bind(null, groupId),
    { revision: defaultRevision },
  );

  useEffect(() => {
    if (state.ok) {
      toast.success("Group updated");
    }
  }, [state]);

  return (
    <form action={formAction}>
      <fieldset
        disabled={pending || !canManage}
        className="flex flex-col gap-4"
      >
        <input
          type="hidden"
          name="revision"
          value={state.revision ?? defaultRevision}
        />
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit-group-name">Group name</Label>
          <Input
            id="edit-group-name"
            name="name"
            defaultValue={defaultName}
            required
          />
        </div>

        <TeacherAssignmentPicker
          teachers={teachers}
          defaultTeacherIds={defaultTeacherIds}
          readOnly={!canAssign}
        />

        {!canAssign && (
          <FormMessage variant="error">
            Teacher assignments are read-only for your account.
          </FormMessage>
        )}
        {state.error && (
          <>
            <FormMessage variant="error">{state.error}</FormMessage>
            <Button
              type="button"
              variant="outline"
              onClick={() => window.location.reload()}
            >
              Reload latest group
            </Button>
          </>
        )}

        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </fieldset>
    </form>
  );
}
