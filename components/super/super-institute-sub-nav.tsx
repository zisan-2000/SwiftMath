"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import {
  SUPER_INSTITUTE_NAV,
  getActiveSuperInstituteTab,
} from "@/lib/super-institute-nav";

/** Horizontal tab bar for a single institute workspace. */
export function SuperInstituteSubNav({ instituteId }: { instituteId: string }) {
  const pathname = usePathname();
  const active = getActiveSuperInstituteTab(pathname, instituteId);

  return (
    <nav
      aria-label="Institute sections"
      className="-mx-1 flex gap-1 overflow-x-auto border-b border-border pb-px"
    >
      {SUPER_INSTITUTE_NAV.map((item) => {
        const isActive = item.id === active;
        return (
          <Link
            key={item.id}
            href={item.href(instituteId)}
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
