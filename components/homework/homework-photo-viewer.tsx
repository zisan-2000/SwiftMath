"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ImageIcon, LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function HomeworkPhotoViewer({
  submissionId,
  kind,
  label,
  studentName,
}: {
  submissionId: string;
  kind: "first" | "final";
  label: string;
  studentName: string;
}) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const pushedHistoryEntry = useRef(false);
  const dialogId = `homework-photo-${submissionId}-${kind}`;

  useEffect(() => {
    const closeFromBrowserBack = () => {
      if (!pushedHistoryEntry.current) return;
      pushedHistoryEntry.current = false;
      setOpen(false);
    };
    window.addEventListener("popstate", closeFromBrowserBack);
    return () => window.removeEventListener("popstate", closeFromBrowserBack);
  }, []);

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setLoaded(false);
      if (!pushedHistoryEntry.current) {
        window.history.pushState(
          { ...window.history.state, homeworkPhotoDialog: dialogId },
          "",
          `${window.location.pathname}${window.location.search}#${dialogId}`,
        );
        pushedHistoryEntry.current = true;
      }
      setOpen(true);
      return;
    }

    if (pushedHistoryEntry.current) {
      window.history.back();
    } else {
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="outline">
          <ImageIcon aria-hidden="true" />
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl p-3 sm:p-5">
        <DialogHeader className="pr-8">
          <DialogTitle>{studentName} · {label}</DialogTitle>
          <DialogDescription>
            Close this viewer or press your device Back button to return to the same homework record.
          </DialogDescription>
        </DialogHeader>
        <div className="relative flex min-h-64 items-center justify-center overflow-hidden rounded-lg bg-black/90">
          {!loaded && (
            <div className="absolute inset-0 z-10 flex items-center justify-center text-white" role="status">
              <LoaderCircle className="mr-2 h-5 w-5 animate-spin" aria-hidden="true" />
              Loading photo…
            </div>
          )}
          <Image
            src={`/api/homework/photos/${submissionId}/${kind}`}
            alt={`${studentName} ${label.toLowerCase()}`}
            width={1600}
            height={1200}
            unoptimized
            className="max-h-[75dvh] h-auto w-auto max-w-full object-contain"
            onLoad={() => setLoaded(true)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
