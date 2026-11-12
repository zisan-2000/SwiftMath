"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useEffect, useState } from "react";

import { Role } from "@/lib/generated/prisma/enums";
import { isStandaloneDisplay } from "@/lib/pwa";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, getActiveHref } from "@/components/nav/nav-config";
import { useNotificationSync } from "@/components/nav/notification-sync-provider";
import type { NavBadgeMap } from "@/lib/nav-badges";

function navigationSection(href: string): string {
  if (/\/(settings|help\/install)$/.test(href)) return "Preferences";
  if (/\/(notifications|activity|reports|ranking)$/.test(href))
    return "Insights & updates";
  if (/\/(levels|academic-levels)$/.test(href)) return "Curriculum";
  return "Workspace";
}

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

  return <SidebarNav role={role} badges={navBadges} onNavigate={onNavigate} />;
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
  const [showGetAppHint, setShowGetAppHint] = useState(false);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- client-only standalone detection */
    setShowGetAppHint(role === Role.STUDENT && !isStandaloneDisplay());
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [role]);

  return (
    <nav aria-label="Primary navigation" className="flex flex-col gap-1">
      {items.map((item, index) => {
        const active = item.href === activeHref;
        const Icon = item.icon;
        const badge = badges[item.href];
        const isExamDot = badge === "!";
        const isGetAppHint =
          showGetAppHint && item.href === "/student/help/install";
        const section = navigationSection(item.href);
        const showSection =
          index === 0 || navigationSection(items[index - 1]!.href) !== section;

        return (
          <Fragment key={item.href}>
            {showSection && (
              <p className="px-3 pb-2 pt-5 text-[10px] font-semibold uppercase tracking-[.14em] text-muted-foreground">
                {section}
              </p>
            )}
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active
                  ? "bg-primary/10 text-primary ring-1 ring-inset ring-primary/10"
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
                {isGetAppHint && !isExamDot && (
                  <span
                    className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-primary ring-2 ring-card"
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
              {isGetAppHint && (
                <span className="sr-only">Install app on your phone</span>
              )}
            </Link>
          </Fragment>
        );
      })}
    </nav>
  );
}
