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
  canAssign = true,
}: {
  teachers: TeacherOption[];
  canAssign?: boolean;
}) {
  const [open, setOpen] = useState(false);


  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          Create group
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a group</DialogTitle>
          <DialogDescription>
            Name the group and assign one or more teachers. Students can be added
            afterward.
          </DialogDescription>
        </DialogHeader>
        <CreateGroupForm
          teachers={teachers}
          canAssign={canAssign}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
