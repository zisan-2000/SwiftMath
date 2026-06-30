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
import { AddInstituteForm } from "@/components/super/add-institute-form";

/** Header action that opens the "create institute" form in a modal. */
export function AddInstituteDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          New institute
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create an institute</DialogTitle>
          <DialogDescription>
            Stand up a new tenant with optional branding, its first admin, a
            9-level starter curriculum, and a question bank. The admin signs in
            with the temporary password you set here.
          </DialogDescription>
        </DialogHeader>
        <AddInstituteForm onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
