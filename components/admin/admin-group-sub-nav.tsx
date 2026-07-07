"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import {
  ADMIN_GROUP_NAV,
  getActiveAdminGroupTab,
} from "@/lib/admin-group-nav";

/** Horizontal tab bar for a single group workspace. */
export function AdminGroupSubNav({ groupId }: { groupId: string }) {
  const pathname = usePathname();
  const active = getActiveAdminGroupTab(pathname, groupId);

  return (
    <nav
      aria-label="Group sections"
      className="-mx-1 flex gap-1 overflow-x-auto border-b border-border pb-px"
    >
      {ADMIN_GROUP_NAV.map((item) => {
        const isActive = item.id === active;
        return (
          <Link
            key={item.id}
            href={item.href(groupId)}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-t-md px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
