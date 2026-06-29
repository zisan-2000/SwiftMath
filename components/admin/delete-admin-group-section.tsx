"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteGroupAction } from "@/app/admin/groups/[groupId]/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/** Destructive action to delete an empty group from the admin panel. */
export function DeleteAdminGroupSection({
  groupId,
  groupName,
  studentCount,
}: {
  groupId: string;
  groupName: string;
  studentCount: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  if (studentCount > 0) {
    return (
      <p className="text-sm text-muted-foreground">
        To delete this group, move all {studentCount}{" "}
        {studentCount === 1 ? "student" : "students"} to another group first.
      </p>
    );
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteGroupAction(groupId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Group deleted");
      setOpen(false);
      router.push("/admin/groups");
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="destructive" size="sm">
          <Trash2 className="h-4 w-4" />
          Delete group
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete “{groupName}”?</DialogTitle>
          <DialogDescription>
            This permanently removes the empty group. This action cannot be
            undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={pending}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            type="button"
            variant="destructive"
            disabled={pending}
            onClick={handleDelete}
          >
            {pending ? "Deleting…" : "Delete group"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
