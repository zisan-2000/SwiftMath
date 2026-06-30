import Link from "next/link";

import {
  formatAuditActionLabel,
  formatAuditTimestamp,
  teacherActivityHref,
} from "@/lib/audit-log";
import type { AuditLogListItem } from "@/server/audit-log";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ChevronLeft, ChevronRight, ScrollText } from "lucide-react";
import { pageRangeEnd, pageRangeStart } from "@/lib/pagination";

/** Read-only list of a teacher's own question override changes. */
export function TeacherActivityList({
  items,
  emptyDescription = "Your question enable/disable changes will appear here.",
  viewAllHref,
  pagination,
}: {
  items: AuditLogListItem[];
  emptyDescription?: string;
  viewAllHref?: string;
  pagination?: {
    groupId: string | null;
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={ScrollText}
        title="No changes yet"
        description={emptyDescription}
        className="border-0"
      />
    );
  }

  return (
    <>
      <ul className="divide-y divide-border">
        {items.map((entry) => (
          <li key={entry.id} className="px-5 py-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 space-y-1">
                <p className="text-sm text-foreground">{entry.summary}</p>
                <time
                  className="text-xs text-muted-foreground"
                  dateTime={entry.createdAt.toISOString()}
                >
                  {formatAuditTimestamp(entry.createdAt)}
                </time>
              </div>
              <Badge variant="secondary" className="shrink-0">
                {formatAuditActionLabel(entry.action)}
              </Badge>
            </div>
          </li>
        ))}
      </ul>

      {(viewAllHref || pagination) && (
        <div className="flex flex-col gap-3 border-t border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          {pagination && pagination.totalPages > 1 ? (
            <>
              <p className="text-sm text-muted-foreground">
                Showing {pageRangeStart(pagination.page, pagination.pageSize)}–
                {pageRangeEnd(
                  pagination.page,
                  pagination.pageSize,
                  pagination.total,
                )}{" "}
                of {pagination.total}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  asChild={pagination.page > 1}
                >
                  {pagination.page > 1 ? (
                    <Link
                      href={teacherActivityHref({
                        groupId: pagination.groupId,
                        page: pagination.page - 1,
                      })}
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
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  asChild={pagination.page < pagination.totalPages}
                >
                  {pagination.page < pagination.totalPages ? (
                    <Link
                      href={teacherActivityHref({
                        groupId: pagination.groupId,
                        page: pagination.page + 1,
                      })}
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
            </>
          ) : viewAllHref ? (
            <Button asChild variant="outline" size="sm">
              <Link href={viewAllHref}>View all your changes</Link>
            </Button>
          ) : null}
        </div>
      )}
    </>
  );
}
