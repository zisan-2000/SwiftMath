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
import { AddTeacherForm } from "@/components/admin/add-teacher-form";

/** Header action that opens the "add teacher" form in a modal. */
export function AddTeacherDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          Add teacher
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a teacher</DialogTitle>
          <DialogDescription>
            Create a teacher account for your institute. They sign in with the
            temporary password you set here.
          </DialogDescription>
        </DialogHeader>
        <AddTeacherForm onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
