import type { ReactNode } from "react";

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
  children,
}: AppShellProps) {
  const showNotificationSync = roleHasNotificationInbox(user.role);
  const notificationInitial = showNotificationSync
    ? await getNotificationSummaryPayload(user)
    : null;
  const pollIntervalMs = getNotificationPollIntervalMs();
  const NavComponent = showNotificationSync ? SidebarNavWithBadges : SidebarNav;

  const shell = (
    <div className="flex min-h-svh">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring"
      >
        Skip to main content
      </a>

      <aside
        aria-label="Primary navigation"
        className="sticky top-0 hidden h-svh w-64 shrink-0 flex-col border-r border-border/80 bg-card/75 backdrop-blur-xl lg:flex"
      >
        <div className="border-b border-border px-4 py-4">
          <Brand
            instituteName={instituteName}
            role={user.role}
            logoUrl={instituteLogoUrl}
          />
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <NavComponent role={user.role} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-border/80 bg-background/70 px-4 backdrop-blur-xl sm:gap-3 lg:px-8">
          <MobileNav
            role={user.role}
            instituteName={instituteName}
            instituteLogoUrl={instituteLogoUrl}
            showNavBadges={showNotificationSync}
          />
          <div className="min-w-0 flex-1 lg:hidden">
            <Brand
              instituteName={instituteName}
              role={user.role}
              logoUrl={instituteLogoUrl}
            />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <HeaderActions user={user} />
          </div>
        </header>

        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 px-4 py-8 outline-none lg:px-8"
        >
          <div className="mx-auto w-full max-w-5xl animate-in fade-in-50 duration-300">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  {title}
                </h1>
                {subtitle && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {subtitle}
                  </p>
                )}
              </div>
              {actions && (
                <div className="flex shrink-0 items-center gap-2">{actions}</div>
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
