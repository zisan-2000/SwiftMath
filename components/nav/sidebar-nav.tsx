"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import type { Role } from "@/lib/generated/prisma/enums";
import { NAV_ITEMS, getActiveHref } from "@/components/nav/nav-config";
import { useNotificationSync } from "@/components/nav/notification-sync-provider";
import type { NavBadgeMap } from "@/lib/nav-badges";

/**
 * Vertical navigation list with live sidebar badges from notification sync.
 */
export function SidebarNavWithBadges({
  role,
  onNavigate,
}: {
  role: Role;
  onNavigate?: () => void;
}) {
  const { navBadges } = useNotificationSync();

  return (
    <SidebarNav role={role} badges={navBadges} onNavigate={onNavigate} />
  );
}

/**
 * Vertical navigation list, shared by the desktop sidebar and the mobile
 * drawer. Highlights the active route via longest-prefix matching.
 */
export function SidebarNav({
  role,
  badges = {},
  onNavigate,
}: {
  role: Role;
  badges?: NavBadgeMap;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const items = NAV_ITEMS[role];
  const activeHref = getActiveHref(items, pathname);

  return (
    <nav aria-label="Primary navigation" className="flex flex-col gap-1">
      {items.map((item) => {
        const active = item.href === activeHref;
        const Icon = item.icon;
        const badge = badges[item.href];
        const isExamDot = badge === "!";

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            <span className="relative shrink-0">
              <Icon
                className={cn(
                  "h-4 w-4 transition-colors",
                  active
                    ? "text-primary"
                    : "text-muted-foreground/70 group-hover:text-accent-foreground",
                )}
              />
              {isExamDot && (
                <span
                  className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-card"
                  aria-hidden="true"
                />
              )}
            </span>
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
            {badge != null && badge !== "!" && (
              <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold leading-none text-primary-foreground">
                {badge}
              </span>
            )}
            {isExamDot && <span className="sr-only">Exam available</span>}
          </Link>
        );
      })}
    </nav>
  );
}
