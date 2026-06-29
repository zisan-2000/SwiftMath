"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AddStudentForm } from "@/components/admin/add-student-form";

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

/** Header action that opens the admin "add student" form in a modal. */
export function AddStudentDialog({
  groups,
  levels,
}: {
  groups: GroupOption[];
  levels: LevelOption[];
}) {
  const [open, setOpen] = useState(false);
  const disabled = groups.length === 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={disabled}>
          <Plus className="h-4 w-4" />
          Add student
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a student</DialogTitle>
          <DialogDescription>
            Create a student account and place them in one of your institute&apos;s
            groups. Optionally set a starting level.
          </DialogDescription>
        </DialogHeader>
        <AddStudentForm
          groups={groups}
          levels={levels}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
