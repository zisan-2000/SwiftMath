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
import { AddStudentForm } from "@/components/teacher/add-student-form";

/** Header action that opens the "add student" form in a modal. */
export function AddStudentDialog({ groupId }: { groupId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          Add student
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a student</DialogTitle>
          <DialogDescription>
            Create a student account and place them in this group. They sign in
            with the temporary password you set here.
          </DialogDescription>
        </DialogHeader>
        <AddStudentForm groupId={groupId} onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
