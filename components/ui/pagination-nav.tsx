import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import {
  pageRangeEnd,
  pageRangeStart,
} from "@/lib/pagination";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PaginationNavProps {
  basePath: string;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  className?: string;
}

/** Build a path preserving only the page query param. */
function pageHref(basePath: string, page: number): string {
  return page <= 1 ? basePath : `${basePath}?page=${page}`;
}

/**
 * Previous/next links for a paginated server-rendered list. Hidden when
 * everything fits on one page.
 */
export function PaginationNav({
  basePath,
  page,
  pageSize,
  total,
  totalPages,
  className,
}: PaginationNavProps) {
  if (totalPages <= 1) return null;

  const start = pageRangeStart(page, pageSize);
  const end = pageRangeEnd(page, pageSize, total);
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

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
          {hasPrev ? (
            <Link href={pageHref(basePath, page - 1)} className="gap-1">
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
          {hasNext ? (
            <Link href={pageHref(basePath, page + 1)} className="gap-1">
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
