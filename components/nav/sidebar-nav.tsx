"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import type { Role } from "@/lib/generated/prisma/enums";
import { NAV_ITEMS, getActiveHref } from "@/components/nav/nav-config";

/**
 * Vertical navigation list, shared by the desktop sidebar and the mobile
 * drawer. Highlights the active route via longest-prefix matching.
 *
 * `onNavigate` lets the mobile drawer close itself when a link is tapped.
 */
export function SidebarNav({
  role,
  onNavigate,
}: {
  role: Role;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const items = NAV_ITEMS[role];
  const activeHref = getActiveHref(items, pathname);

  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const active = item.href === activeHref;
        const Icon = item.icon;
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
            <Icon
              className={cn(
                "h-4 w-4 shrink-0 transition-colors",
                active
                  ? "text-primary"
                  : "text-muted-foreground/70 group-hover:text-accent-foreground",
              )}
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
