"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  EditInstituteForm,
  type EditableInstitute,
} from "@/components/super/edit-institute-form";

/** Row action that opens the "edit institute" form in a modal. */
export function EditInstituteDialog({
  institute,
}: {
  institute: EditableInstitute;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Pencil className="h-4 w-4" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit institute</DialogTitle>
          <DialogDescription>
            Update this institute&apos;s name, slug, and white-label branding.
          </DialogDescription>
        </DialogHeader>
        <EditInstituteForm
          institute={institute}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
