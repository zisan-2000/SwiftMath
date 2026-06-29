"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";

import {
  addStudentAction,
  type AddStudentState,
} from "@/app/admin/students/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormMessage } from "@/components/ui/form-message";

const SELECT_CLASS =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring";

interface GroupOption {
  id: string;
  name: string;
  teacherName: string;
}

interface LevelOption {
  id: string;
  orderIndex: number;
  name: string;
}

/** Form for an admin to create a student and place them in a group. */
export function AddStudentForm({
  groups,
  levels,
  onSuccess,
}: {
  groups: GroupOption[];
  levels: LevelOption[];
  onSuccess?: () => void;
}) {
  const [state, formAction, pending] = useActionState<
    AddStudentState,
    FormData
  >(addStudentAction, {});

  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      toast.success("Student added");
      onSuccess?.();
    }
  }, [state, onSuccess]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="admin-student-group">Group</Label>
          <select
            id="admin-student-group"
            name="groupId"
            className={SELECT_CLASS}
            required
            defaultValue=""
          >
            <option value="" disabled>
              Choose a group…
            </option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name} ({group.teacherName})
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="admin-student-name">Full name</Label>
          <Input
            id="admin-student-name"
            name="name"
            placeholder="Jane Doe"
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="admin-student-email">Email</Label>
          <Input
            id="admin-student-email"
            name="email"
            type="email"
            placeholder="jane@institute.test"
            autoComplete="off"
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="admin-student-password">Temporary password</Label>
          <Input
            id="admin-student-password"
            name="password"
            type="password"
            placeholder="Min. 8 characters"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="admin-student-level">Starting level (optional)</Label>
          <select
            id="admin-student-level"
            name="levelId"
            className={SELECT_CLASS}
            defaultValue=""
          >
            <option value="">— No level yet —</option>
            {levels.map((level) => (
              <option key={level.id} value={level.id}>
                {level.orderIndex}. {level.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {state.error && <FormMessage variant="error">{state.error}</FormMessage>}

      <div>
        <Button type="submit" disabled={pending || groups.length === 0}>
          {pending ? "Adding…" : "Add student"}
        </Button>
      </div>
    </form>
  );
}
