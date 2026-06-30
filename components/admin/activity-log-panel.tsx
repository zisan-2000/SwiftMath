import Link from "next/link";

import {
  AUDIT_ACTION_FILTER_OPTIONS,
  auditActivityHref,
  formatAuditActionLabel,
  formatAuditTimestamp,
} from "@/lib/audit-log";
import type { AuditLogListItem } from "@/server/audit-log";
import { AuditAction, Role } from "@/lib/generated/prisma/enums";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ScrollText, ChevronLeft, ChevronRight } from "lucide-react";
import { pageRangeEnd, pageRangeStart } from "@/lib/pagination";

function roleLabel(role: Role): string {
  switch (role) {
    case Role.ADMIN:
      return "Admin";
    case Role.TEACHER:
      return "Teacher";
    default:
      return role;
  }
}

/** Paginated institute question-control activity log. */
export function ActivityLogPanel({
  basePath,
  items,
  page,
  pageSize,
  total,
  totalPages,
  actionFilter,
}: {
  basePath: string;
  items: AuditLogListItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  actionFilter: AuditAction | null;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {actionFilter
            ? `Showing ${formatAuditActionLabel(actionFilter)} events`
            : "All question-control events"}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            asChild
            variant={actionFilter === null ? "secondary" : "outline"}
            size="sm"
          >
            <Link href={auditActivityHref(basePath, 1, null)}>All</Link>
          </Button>
          {AUDIT_ACTION_FILTER_OPTIONS.slice(0, 6).map((action) => (
            <Button
              key={action}
              asChild
              variant={actionFilter === action ? "secondary" : "outline"}
              size="sm"
            >
              <Link href={auditActivityHref(basePath, 1, action)}>
                {formatAuditActionLabel(action)}
              </Link>
            </Button>
          ))}
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="No activity yet"
          description="Question bank changes and teacher group overrides will appear here."
          className="border-0"
        />
      ) : (
        <>
          <ul className="divide-y divide-border">
            {items.map((entry) => (
              <li key={entry.id} className="px-5 py-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-2">
                    <p className="text-sm text-foreground">{entry.summary}</p>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>{entry.actorName}</span>
                      <span aria-hidden>·</span>
                      <span>{roleLabel(entry.actorRole)}</span>
                      <span aria-hidden>·</span>
                      <time dateTime={entry.createdAt.toISOString()}>
                        {formatAuditTimestamp(entry.createdAt)}
                      </time>
                    </div>
                  </div>
                  <Badge variant="secondary" className="shrink-0">
                    {formatAuditActionLabel(entry.action)}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
          {totalPages > 1 && (
            <nav
              aria-label="Activity pagination"
              className="flex flex-col gap-3 border-t border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <p className="text-sm text-muted-foreground">
                Showing {pageRangeStart(page, pageSize)}–
                {pageRangeEnd(page, pageSize, total)} of {total}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  asChild={page > 1}
                >
                  {page > 1 ? (
                    <Link
                      href={auditActivityHref(basePath, page - 1, actionFilter)}
                      className="gap-1"
                    >
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
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  asChild={page < totalPages}
                >
                  {page < totalPages ? (
                    <Link
                      href={auditActivityHref(basePath, page + 1, actionFilter)}
                      className="gap-1"
                    >
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
          )}
        </>
      )}
    </div>
  );
}
