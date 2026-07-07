import { Role } from "@/lib/generated/prisma/enums";
import { NAV_ITEMS } from "@/components/nav/nav-config";

/** Sidebar badge values keyed by nav href. */
export type NavBadgeMap = Record<string, number | string>;

/** Map live sync state onto primary nav links. */
export function buildNavBadges(
  role: Role,
  input: { unreadCount: number; hasPendingExam?: boolean },
): NavBadgeMap {
  const badges: NavBadgeMap = {};

  if (input.unreadCount > 0) {
    const notificationsItem = NAV_ITEMS[role].find(
      (item) => item.label === "Notifications",
    );
    if (notificationsItem) {
      badges[notificationsItem.href] =
        input.unreadCount > 99 ? "99+" : input.unreadCount;
    }
  }

  if (role === Role.STUDENT && input.hasPendingExam) {
    badges["/student"] = "!";
  }

  return badges;
}
