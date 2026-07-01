import Link from "next/link";

import { cn } from "@/lib/utils";
import type { Role } from "@/lib/generated/prisma/enums";
import {
  formatNotificationTypeLabel,
  notificationInboxHref,
  notificationTypeFilterOptions,
  type NotificationInboxFilters,
  type NotificationReadFilter,
} from "@/lib/notifications";
import { NotificationType } from "@/lib/generated/prisma/enums";

/** Server-rendered filter bar for the notifications inbox. */
export function NotificationInboxFilters({
  role,
  filters,
}: {
  role: Role;
  filters: NotificationInboxFilters;
}) {
  const typeOptions = notificationTypeFilterOptions(role);

  return (
    <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Show
        </span>
        <FilterPill
          href={notificationInboxHref(role, {
            page: 1,
            type: filters.type,
            read: "all",
          })!}
          active={filters.read === "all"}
          label="All"
        />
        <FilterPill
          href={notificationInboxHref(role, {
            page: 1,
            type: filters.type,
            read: "unread",
          })!}
          active={filters.read === "unread"}
          label="Unread"
        />
      </div>

      {typeOptions.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Type
          </span>
          <FilterPill
            href={notificationInboxHref(role, {
              page: 1,
              type: null,
              read: filters.read,
            })!}
            active={filters.type === null}
            label="Any"
          />
          {typeOptions.map((type) => (
            <FilterPill
              key={type}
              href={notificationInboxHref(role, {
                page: 1,
                type,
                read: filters.read,
              })!}
              active={filters.type === type}
              label={formatNotificationTypeLabel(type)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterPill({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground",
      )}
      aria-current={active ? "true" : undefined}
    >
      {label}
    </Link>
  );
}

export type { NotificationReadFilter, NotificationType };
