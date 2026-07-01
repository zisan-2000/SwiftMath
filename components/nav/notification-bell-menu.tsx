"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Role } from "@/lib/generated/prisma/enums";
import type { NotificationListItem } from "@/lib/notifications";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationDropdownList } from "@/components/notifications/notification-list";

/** Header bell with unread badge and recent notifications dropdown. */
export function NotificationBellMenu({
  role,
  unreadCount,
  recent,
}: {
  role: Role;
  unreadCount: number;
  recent: NotificationListItem[];
}) {
  const router = useRouter();
  const [localUnreadCount, setLocalUnreadCount] = useState(unreadCount);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setLocalUnreadCount(unreadCount);
  }, [unreadCount]);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) {
      router.refresh();
    }
  }

  function handleItemRead() {
    setLocalUnreadCount((count) => Math.max(0, count - 1));
  }

  const badgeLabel =
    localUnreadCount > 99
      ? "99+"
      : localUnreadCount > 0
        ? String(localUnreadCount)
        : null;

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger
        aria-label={
          localUnreadCount > 0
            ? `Notifications, ${localUnreadCount} unread`
            : "Notifications"
        }
        className={cn(
          "relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        )}
      >
        <Bell className="h-4 w-4" />
        {badgeLabel && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground">
            {badgeLabel}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <DropdownMenuLabel className="px-3 py-2">Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator className="m-0" />
        <NotificationDropdownList
          role={role}
          items={recent}
          onItemRead={handleItemRead}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
