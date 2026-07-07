/** Sub-navigation tabs inside an admin level workspace. */

export type AdminLevelTab = "overview" | "questions" | "settings";

export interface AdminLevelNavItem {
  id: AdminLevelTab;
  label: string;
  href: (levelId: string) => string;
}

export const ADMIN_LEVEL_NAV: AdminLevelNavItem[] = [
  { id: "overview", label: "Overview", href: (id) => `/admin/levels/${id}` },
  {
    id: "questions",
    label: "Question bank",
    href: (id) => `/admin/levels/${id}/questions`,
  },
  {
    id: "settings",
    label: "Settings",
    href: (id) => `/admin/levels/${id}/settings`,
  },
];

/** Resolve which level tab is active from the current pathname. */
export function getActiveAdminLevelTab(
  pathname: string,
  levelId: string,
): AdminLevelTab {
  const base = `/admin/levels/${levelId}`;
  if (pathname === base) return "overview";

  for (const item of ADMIN_LEVEL_NAV) {
    if (item.id === "overview") continue;
    const href = item.href(levelId);
    if (pathname === href || pathname.startsWith(`${href}/`)) {
      return item.id;
    }
  }

  return "overview";
}
