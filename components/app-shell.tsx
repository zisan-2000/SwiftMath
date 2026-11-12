import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight, CircleHelp, PanelsTopLeft } from "lucide-react";
import { cn } from "@/lib/utils";

import type { Role } from "@/lib/generated/prisma/enums";
import { roleHasNotificationInbox } from "@/lib/notifications";
import { getNotificationPollIntervalMs } from "@/lib/notification-poll";
import { getNotificationSummaryPayload } from "@/server/notification-summary";
import { HeaderActions } from "@/components/nav/header-actions";
import { Brand } from "@/components/nav/brand";
import { SidebarNav, SidebarNavWithBadges } from "@/components/nav/sidebar-nav";
import { MobileNav } from "@/components/nav/mobile-nav";
import { NotificationSyncProvider } from "@/components/nav/notification-sync-provider";

interface AppShellProps {
  /** The signed-in user, already fetched + authorised by the page. */
  user: { id: string; name: string; role: Role; instituteId: string };
  /** Display name of the user's institute (white-label brand). */
  instituteName: string;
  /** Optional white-label logo URL for the institute. */
  instituteLogoUrl?: string | null;
  /** Page heading shown at the top of the content area. */
  title: string;
  /** Optional sub-heading / description for the page. */
  subtitle?: string;
  /** Optional page-level actions rendered on the right of the page header. */
  actions?: ReactNode;
  /** Optional secondary nav rendered below the page header (e.g. group tabs). */
  subNav?: ReactNode;
  /** Wider, editorial composition for the three role home dashboards only. */
  dashboard?: boolean;
  children: ReactNode;
}

/**
 * Shared chrome for every authenticated page: a fixed sidebar (desktop) / drawer
 * (mobile) with role-based navigation, a sticky top bar with the theme toggle
 * and user menu, and a titled content area. Presentational only — pages do
 * their own auth (requireRole) and pass the resulting user in.
 */
export async function AppShell({
  user,
  instituteName,
  instituteLogoUrl,
  title,
  subtitle,
  actions,
  subNav,
  dashboard = false,
  children,
}: AppShellProps) {
  const showNotificationSync = roleHasNotificationInbox(user.role);
  const notificationInitial = showNotificationSync
    ? await getNotificationSummaryPayload(user)
    : null;
  const pollIntervalMs = getNotificationPollIntervalMs();
  const NavComponent = showNotificationSync ? SidebarNavWithBadges : SidebarNav;

  const shell = (
    <div
      className="app-shell flex min-h-svh"
      data-workspace={user.role.toLowerCase()}
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring"
      >
        Skip to main content
      </a>

      <aside
        aria-label="Primary navigation"
        className="app-sidebar sticky top-0 hidden h-svh w-60 shrink-0 flex-col border-r border-border lg:flex"
      >
        <div className="px-5 pb-7 pt-7">
          <Brand
            instituteName={instituteName}
            role={user.role}
            logoUrl={instituteLogoUrl}
          />
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-5">
          <NavComponent role={user.role} />
        </div>
        <div className="mx-4 mb-5 border-t border-border pt-4">
          <Link
            href="/account"
            className="flex items-center gap-3 rounded-lg p-2 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <CircleHelp className="size-4 shrink-0" aria-hidden="true" />
            <span className="flex-1">Your account</span>
            <ArrowUpRight className="size-3.5" aria-hidden="true" />
          </Link>
          <p className="px-2 pt-3 text-[10px] tracking-wide text-muted-foreground">
            SEFT Abacus · A little better, every day.
          </p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="app-topbar sticky top-0 z-30 flex h-[72px] items-center gap-2 border-b border-border px-4 backdrop-blur-xl sm:gap-3 lg:px-8">
          <MobileNav
            role={user.role}
            instituteName={instituteName}
            instituteLogoUrl={instituteLogoUrl}
            showNavBadges={showNotificationSync}
          />
          <div className="min-w-0 flex-1 lg:hidden">
            <Brand
              className="app-mobile-brand"
              instituteName={instituteName}
              role={user.role}
              logoUrl={instituteLogoUrl}
            />
          </div>
          <div className="hidden min-w-0 items-center gap-2.5 text-xs text-muted-foreground lg:flex">
            <PanelsTopLeft className="size-4 shrink-0" aria-hidden="true" />
            <span>
              {user.role === "ADMIN"
                ? "Institute workspace"
                : user.role === "TEACHER"
                  ? "Teaching studio"
                  : user.role === "STUDENT"
                    ? "My learning"
                    : "Platform workspace"}
            </span>
            <span className="text-border" aria-hidden="true">
              /
            </span>
            <span className="truncate text-foreground">{title}</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <HeaderActions user={user} />
          </div>
        </header>
        <div id="app-update-notice" className="print:hidden" />

        <main
          id="main-content"
          tabIndex={-1}
          className="min-w-0 flex-1 px-4 py-6 outline-none sm:px-6 lg:px-8 lg:py-8"
        >
          <div
            className={cn(
              "mx-auto w-full motion-safe:animate-in motion-safe:fade-in-50 motion-safe:duration-300",
              dashboard ? "max-w-7xl" : "max-w-5xl",
            )}
          >
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h1
                  className={cn(
                    "font-semibold tracking-tight text-foreground",
                    dashboard ? "text-xl" : "text-2xl",
                  )}
                >
                  {title}
                </h1>
                {subtitle && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {subtitle}
                  </p>
                )}
              </div>
              {actions && (
                <div className="flex shrink-0 items-center gap-2">
                  {actions}
                </div>
              )}
            </div>
            {subNav}
            {children}
          </div>
        </main>
      </div>
    </div>
  );

  if (!showNotificationSync || !notificationInitial) {
    return shell;
  }

  return (
    <NotificationSyncProvider
      role={user.role}
      initial={notificationInitial}
      pollIntervalMs={pollIntervalMs}
    >
      {shell}
    </NotificationSyncProvider>
  );
}
