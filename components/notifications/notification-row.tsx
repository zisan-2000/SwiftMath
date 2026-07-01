"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { cn } from "@/lib/utils";
import {
  formatNotificationTimestamp,
  formatNotificationTypeLabel,
} from "@/lib/notifications";
import type { NotificationListItem } from "@/lib/notifications";
import { markNotificationReadAction } from "@/app/notifications/actions";
import { Badge } from "@/components/ui/badge";

/** Notification row that marks read when opened. */
export function NotificationRow({
  item,
  compact = false,
}: {
  item: NotificationListItem;
  compact?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const unread = item.readAt === null;

  function handleNavigate() {
    if (!unread) return;
    startTransition(async () => {
      await markNotificationReadAction(item.id);
      router.refresh();
    });
  }

  return (
    <Link
      href={item.href}
      onClick={handleNavigate}
      className={cn(
        "block transition-colors hover:bg-accent/50",
        compact ? "px-3 py-2.5" : "px-5 py-4",
        pending && "opacity-70",
        unread && !compact && "bg-primary/5",
      )}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            {unread && (
              <span
                className="size-2 shrink-0 rounded-full bg-primary"
                aria-hidden
              />
            )}
            <p
              className={cn(
                "text-sm text-foreground",
                unread && "font-medium",
              )}
            >
              {item.title}
            </p>
          </div>
          <p className="text-sm text-muted-foreground">{item.body}</p>
          <time
            className="text-xs text-muted-foreground"
            dateTime={item.createdAt.toISOString()}
          >
            {formatNotificationTimestamp(item.createdAt)}
          </time>
        </div>
        <Badge variant="secondary" className="shrink-0">
          {formatNotificationTypeLabel(item.type)}
        </Badge>
      </div>
    </Link>
  );
}
