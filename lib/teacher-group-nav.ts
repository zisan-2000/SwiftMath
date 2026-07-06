/** Sub-navigation tabs inside a teacher group workspace. */

export type TeacherGroupTab =
  | "overview"
  | "students"
  | "exams"
  | "analytics"
  | "questions"
  | "settings";

export interface TeacherGroupNavItem {
  id: TeacherGroupTab;
  label: string;
  href: (groupId: string) => string;
}

export const TEACHER_GROUP_NAV: TeacherGroupNavItem[] = [
  { id: "overview", label: "Overview", href: (id) => `/teacher/groups/${id}` },
  {
    id: "students",
    label: "Students",
    href: (id) => `/teacher/groups/${id}/students`,
  },
  { id: "exams", label: "Exams", href: (id) => `/teacher/groups/${id}/exams` },
  {
    id: "analytics",
    label: "Analytics",
    href: (id) => `/teacher/groups/${id}/analytics`,
  },
  {
    id: "questions",
    label: "Questions",
    href: (id) => `/teacher/groups/${id}/questions`,
  },
  {
    id: "settings",
    label: "Settings",
    href: (id) => `/teacher/groups/${id}/settings`,
  },
];

/** Resolve which group tab is active from the current pathname. */
export function getActiveTeacherGroupTab(
  pathname: string,
  groupId: string,
): TeacherGroupTab {
  const base = `/teacher/groups/${groupId}`;
  if (pathname === base) return "overview";

  for (const item of TEACHER_GROUP_NAV) {
    if (item.id === "overview") continue;
    const href = item.href(groupId);
    if (pathname === href || pathname.startsWith(`${href}/`)) {
      return item.id;
    }
  }

  return "overview";
}
