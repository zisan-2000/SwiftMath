"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { markAllNotificationsReadAction } from "@/app/notifications/actions";
import { Button } from "@/components/ui/button";

/** Mark every unread notification read. */
export function MarkAllReadButton({
  disabled,
}: {
  disabled?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      await markAllNotificationsReadAction();
      router.refresh();
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={disabled || pending}
      onClick={handleClick}
    >
      {pending ? "Marking…" : "Mark all read"}
    </Button>
  );
}
