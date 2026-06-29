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
import { CreateGroupForm } from "@/components/admin/create-group-form";

interface TeacherOption {
  id: string;
  name: string;
  email: string;
}

/** Header action that opens the admin create-group form in a modal. */
export function CreateGroupDialog({
  teachers,
}: {
  teachers: TeacherOption[];
}) {
  const [open, setOpen] = useState(false);
  const disabled = teachers.length === 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={disabled}>
          <Plus className="h-4 w-4" />
          Create group
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a group</DialogTitle>
          <DialogDescription>
            Name the group and assign it to a teacher. Students can be added
            afterward.
          </DialogDescription>
        </DialogHeader>
        <CreateGroupForm
          teachers={teachers}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
