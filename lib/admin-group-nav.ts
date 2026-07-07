/** Sub-navigation tabs inside an admin group workspace. */

export type AdminGroupTab = "overview" | "students" | "settings";

export interface AdminGroupNavItem {
  id: AdminGroupTab;
  label: string;
  href: (groupId: string) => string;
}

export const ADMIN_GROUP_NAV: AdminGroupNavItem[] = [
  { id: "overview", label: "Overview", href: (id) => `/admin/groups/${id}` },
  {
    id: "students",
    label: "Students",
    href: (id) => `/admin/groups/${id}/students`,
  },
  {
    id: "settings",
    label: "Settings",
    href: (id) => `/admin/groups/${id}/settings`,
  },
];

/** Resolve which group tab is active from the current pathname. */
export function getActiveAdminGroupTab(
  pathname: string,
  groupId: string,
): AdminGroupTab {
  const base = `/admin/groups/${groupId}`;
  if (pathname === base) return "overview";

  for (const item of ADMIN_GROUP_NAV) {
    if (item.id === "overview") continue;
    const href = item.href(groupId);
    if (pathname === href || pathname.startsWith(`${href}/`)) {
      return item.id;
    }
  }

  return "overview";
}
