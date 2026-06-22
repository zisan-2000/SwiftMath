import {
  Boxes,
  Brain,
  Building2,
  GraduationCap,
  Home,
  LayoutDashboard,
  Layers,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";

import type { Role } from "@/lib/generated/prisma/enums";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

/**
 * Primary navigation, one list per role. The shell renders this in the desktop
 * sidebar and the mobile drawer. Account settings + sign-out live in the user
 * menu, not here, so this stays focused on the role's working areas.
 */
export const NAV_ITEMS: Record<Role, NavItem[]> = {
  SUPER_ADMIN: [
    { href: "/super", label: "Dashboard", icon: LayoutDashboard },
    { href: "/super/institutes", label: "Institutes", icon: Building2 },
  ],
  ADMIN: [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/teachers", label: "Teachers", icon: Users },
    { href: "/admin/students", label: "Students", icon: GraduationCap },
    { href: "/admin/groups", label: "Groups", icon: Boxes },
    { href: "/admin/levels", label: "Levels", icon: Layers },
  ],
  TEACHER: [
    { href: "/teacher", label: "Dashboard", icon: LayoutDashboard },
    { href: "/teacher/groups", label: "Groups", icon: Boxes },
  ],
  STUDENT: [
    { href: "/student", label: "Home", icon: Home },
    { href: "/student/practice", label: "Practice", icon: Brain },
    { href: "/student/ranking", label: "Ranking", icon: Trophy },
  ],
};

/**
 * Resolve which nav item should be highlighted for the current path. Uses
 * longest-prefix matching so `/admin/teachers` highlights "Teachers" rather
 * than the "/admin" dashboard root.
 */
export function getActiveHref(items: NavItem[], pathname: string): string | null {
  const matches = items.filter(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
  if (matches.length === 0) return null;
  return matches.reduce((best, item) =>
    item.href.length > best.href.length ? item : best,
  ).href;
}
