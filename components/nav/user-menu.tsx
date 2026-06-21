"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronDown, LogOut, User as UserIcon } from "lucide-react";

import { signOut } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/generated/prisma/enums";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** First letters of the first and last word, e.g. "Anwar Hossain" → "AH". */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

/**
 * Avatar + name button that opens a menu with account settings and sign-out.
 * Sign-out runs client-side then bounces to the login page.
 */
export function UserMenu({ user }: { user: { name: string; role: Role } }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleSignOut() {
    setBusy(true);
    await signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={busy}
        aria-label={`Account menu for ${user.name}`}
        className={cn(
          "flex items-center gap-2 rounded-full border border-border bg-background py-1 pl-1 pr-2 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60 sm:rounded-lg sm:py-1.5 sm:pl-2 sm:pr-3",
        )}
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
          {initials(user.name)}
        </span>
        <span className="hidden min-w-0 sm:block">
          <span className="block max-w-[10rem] truncate text-sm font-medium leading-tight text-foreground">
            {user.name}
          </span>
          <span className="block text-xs uppercase leading-tight tracking-wide text-muted-foreground">
            {user.role}
          </span>
        </span>
        <ChevronDown className="hidden h-4 w-4 text-muted-foreground sm:block" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <span className="block truncate text-sm font-medium text-foreground">
            {user.name}
          </span>
          <span className="block text-xs font-normal uppercase tracking-wide text-muted-foreground">
            {user.role}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/account">
            <UserIcon className="h-4 w-4" />
            Account settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault();
            void handleSignOut();
          }}
          className="text-destructive focus:bg-destructive/10 focus:text-destructive"
        >
          <LogOut className="h-4 w-4" />
          {busy ? "Signing out…" : "Sign out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
