import type { ReactNode } from "react";

import type { Role } from "@/lib/generated/prisma/enums";
import { ThemeToggle } from "@/components/theme-toggle";
import { Brand } from "@/components/nav/brand";
import { SidebarNav } from "@/components/nav/sidebar-nav";
import { MobileNav } from "@/components/nav/mobile-nav";
import { UserMenu } from "@/components/nav/user-menu";

interface AppShellProps {
  /** The signed-in user, already fetched + authorised by the page. */
  user: { name: string; role: Role };
  /** Display name of the user's institute (white-label brand). */
  instituteName: string;
  /** Page heading shown at the top of the content area. */
  title: string;
  /** Optional sub-heading / description for the page. */
  subtitle?: string;
  /** Optional page-level actions rendered on the right of the page header. */
  actions?: ReactNode;
  children: ReactNode;
}

/**
 * Shared chrome for every authenticated page: a fixed sidebar (desktop) / drawer
 * (mobile) with role-based navigation, a sticky top bar with the theme toggle
 * and user menu, and a titled content area. Presentational only — pages do
 * their own auth (requireRole) and pass the resulting user in.
 */
export function AppShell({
  user,
  instituteName,
  title,
  subtitle,
  actions,
  children,
}: AppShellProps) {
  return (
    <div className="flex min-h-svh">
      {/* Desktop sidebar — frosted glass so the mesh shows at the edge */}
      <aside className="sticky top-0 hidden h-svh w-64 shrink-0 flex-col border-r border-border/80 bg-card/75 backdrop-blur-xl lg:flex">
        <div className="border-b border-border px-4 py-4">
          <Brand instituteName={instituteName} role={user.role} />
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <SidebarNav role={user.role} />
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border/80 bg-background/70 px-4 backdrop-blur-xl lg:px-8">
          <MobileNav role={user.role} instituteName={instituteName} />
          <div className="lg:hidden">
            <Brand instituteName={instituteName} role={user.role} />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <UserMenu user={user} />
          </div>
        </header>

        <main className="flex-1 px-4 py-8 lg:px-8">
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
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
