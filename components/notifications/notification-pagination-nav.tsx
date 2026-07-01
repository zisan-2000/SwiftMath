import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import {
  notificationInboxHref,
  type NotificationInboxFilters,
} from "@/lib/notifications";
import type { Role } from "@/lib/generated/prisma/enums";
import {
  pageRangeEnd,
  pageRangeStart,
} from "@/lib/pagination";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Pagination for the notifications inbox, preserving active filters. */
export function NotificationPaginationNav({
  role,
  filters,
  page,
  pageSize,
  total,
  totalPages,
  className,
}: {
  role: Role;
  filters: NotificationInboxFilters;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  className?: string;
}) {
  if (totalPages <= 1) return null;

  const start = pageRangeStart(page, pageSize);
  const end = pageRangeEnd(page, pageSize, total);
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  const prevHref = notificationInboxHref(role, {
    page: page - 1,
    type: filters.type,
    read: filters.read,
  });
  const nextHref = notificationInboxHref(role, {
    page: page + 1,
    type: filters.type,
    read: filters.read,
  });

  return (
    <nav
      aria-label="Pagination"
      className={cn(
        "flex flex-col gap-3 border-t border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <p className="text-sm text-muted-foreground">
        Showing {start}–{end} of {total}
      </p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={!hasPrev} asChild={hasPrev}>
          {hasPrev && prevHref ? (
            <Link href={prevHref} className="gap-1">
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Link>
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              Previous
            </>
          )}
        </Button>
        <span className="px-2 text-sm tabular-nums text-muted-foreground">
          Page {page} of {totalPages}
        </span>
        <Button variant="outline" size="sm" disabled={!hasNext} asChild={hasNext}>
          {hasNext && nextHref ? (
            <Link href={nextHref} className="gap-1">
              Next
              <ChevronRight className="h-4 w-4" />
            </Link>
          ) : (
            <>
              Next
              <ChevronRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </nav>
  );
}
