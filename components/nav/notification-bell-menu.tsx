"use client";

import { useState } from "react";
import { Bell } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Role } from "@/lib/generated/prisma/enums";
import type { NotificationListItem } from "@/lib/notifications";
import { useNotificationBellSync } from "@/components/nav/use-notification-bell-sync";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationDropdownList } from "@/components/notifications/notification-list";

/** Header bell with unread badge, polling refresh, and recent dropdown (N10). */
export function NotificationBellMenu({
  role,
  unreadCount,
  recent,
  pollIntervalMs,
}: {
  role: Role;
  unreadCount: number;
  recent: NotificationListItem[];
  pollIntervalMs?: number;
}) {
  const [open, setOpen] = useState(false);
  const {
    unreadCount: liveUnreadCount,
    recent: liveRecent,
    hasNewUnread,
    refresh,
    decrementUnread,
  } = useNotificationBellSync({
    initialUnreadCount: unreadCount,
    initialRecent: recent,
    pollIntervalMs,
  });

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) {
      void refresh();
    }
  }

  const badgeLabel =
    liveUnreadCount > 99
      ? "99+"
      : liveUnreadCount > 0
        ? String(liveUnreadCount)
        : null;

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger
        aria-label={
          liveUnreadCount > 0
            ? `Notifications, ${liveUnreadCount} unread`
            : "Notifications"
        }
        aria-live="polite"
        className={cn(
          "relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        )}
      >
        <Bell
          className={cn("h-4 w-4", hasNewUnread && "animate-pulse text-primary")}
        />
        {badgeLabel && (
          <span
            className={cn(
              "absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground",
              hasNewUnread && "animate-pulse ring-2 ring-primary/40",
            )}
          >
            {badgeLabel}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <DropdownMenuLabel className="px-3 py-2">Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator className="m-0" />
        <NotificationDropdownList
          role={role}
          items={liveRecent}
          onItemRead={decrementUnread}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
