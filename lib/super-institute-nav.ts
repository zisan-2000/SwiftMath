/** Sub-navigation tabs inside a super-admin institute workspace. */

export type SuperInstituteTab = "overview" | "admins" | "settings";

export interface SuperInstituteNavItem {
  id: SuperInstituteTab;
  label: string;
  href: (instituteId: string) => string;
}

export const SUPER_INSTITUTE_NAV: SuperInstituteNavItem[] = [
  {
    id: "overview",
    label: "Overview",
    href: (id) => `/super/institutes/${id}`,
  },
  {
    id: "admins",
    label: "Admins",
    href: (id) => `/super/institutes/${id}/admins`,
  },
  {
    id: "settings",
    label: "Settings",
    href: (id) => `/super/institutes/${id}/settings`,
  },
];

/** Resolve which institute tab is active from the current pathname. */
export function getActiveSuperInstituteTab(
  pathname: string,
  instituteId: string,
): SuperInstituteTab {
  const base = `/super/institutes/${instituteId}`;
  if (pathname === base) return "overview";

  for (const item of SUPER_INSTITUTE_NAV) {
    if (item.id === "overview") continue;
    const href = item.href(instituteId);
    if (pathname === href || pathname.startsWith(`${href}/`)) {
      return item.id;
    }
  }

  return "overview";
}
