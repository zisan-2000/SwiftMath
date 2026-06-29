"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore } from "lucide-react";
import { toast } from "sonner";

import {
  archiveLevelAction,
  unarchiveLevelAction,
} from "@/app/admin/levels/actions";
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

/** Archive or restore a level from the admin edit page. */
export function ArchiveLevelSection({
  levelId,
  levelName,
  studentCount,
  isArchived,
}: {
  levelId: string;
  levelName: string;
  studentCount: number;
  isArchived: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  if (isArchived) {
    function handleUnarchive() {
      startTransition(async () => {
        const result = await unarchiveLevelAction(levelId);
        if (result.error) {
          toast.error(result.error);
          return;
        }
        toast.success("Level restored to the curriculum");
        router.refresh();
      });
    }

    return (
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          This level is archived. It is hidden from assignment and new practice.
          Restore it to make it active again.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={handleUnarchive}
        >
          <ArchiveRestore className="h-4 w-4" />
          {pending ? "Restoring…" : "Restore level"}
        </Button>
      </div>
    );
  }

  function handleArchive() {
    startTransition(async () => {
      const result = await archiveLevelAction(levelId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Level archived");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="destructive" size="sm">
          <Archive className="h-4 w-4" />
          Archive level
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Archive “{levelName}”?</DialogTitle>
          <DialogDescription>
            Archived levels are removed from the active curriculum. Students
            cannot start new practice on this level, and it will not appear in
            assignment menus. Past session history is kept.
          </DialogDescription>
        </DialogHeader>
        {studentCount > 0 && (
          <p className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-foreground">
            {studentCount}{" "}
            {studentCount === 1 ? "student is" : "students are"} currently
            assigned to this level. They will need a new level before they can
            practise again.
          </p>
        )}
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
            onClick={handleArchive}
          >
            {pending ? "Archiving…" : "Archive level"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
