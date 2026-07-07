"use client";

import { useState } from "react";
import { Menu } from "lucide-react";

import type { Role } from "@/lib/generated/prisma/enums";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Brand } from "@/components/nav/brand";
import { SidebarNav, SidebarNavWithBadges } from "@/components/nav/sidebar-nav";

/**
 * Hamburger + slide-in drawer holding the primary navigation. Visible only on
 * small screens (the parent hides it at `lg`). Closes itself when a link is
 * tapped via `SidebarNav`'s `onNavigate`.
 */
export function MobileNav({
  role,
  instituteName,
  instituteLogoUrl,
  showNavBadges = false,
}: {
  role: Role;
  instituteName: string;
  instituteLogoUrl?: string | null;
  showNavBadges?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const NavComponent = showNavBadges ? SidebarNavWithBadges : SidebarNav;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        aria-label="Open menu"
        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
      >
        <Menu className="h-4 w-4" />
      </SheetTrigger>
      <SheetContent side="left" className="flex h-full w-72 max-w-[80vw] flex-col p-0">
        <SheetHeader className="shrink-0 border-b border-border p-4">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <Brand
            instituteName={instituteName}
            role={role}
            logoUrl={instituteLogoUrl}
          />
        </SheetHeader>
        <div className="flex-1 overflow-y-auto p-3">
          <NavComponent role={role} onNavigate={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
