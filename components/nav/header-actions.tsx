import type { Role } from "@/lib/generated/prisma/enums";
import { roleHasNotificationInbox } from "@/lib/notifications";
import { getNotificationPollIntervalMs } from "@/lib/notification-poll";
import {
  getUnreadNotificationCount,
  listRecentNotifications,
} from "@/server/notifications";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/nav/user-menu";
import { NotificationBellMenu } from "@/components/nav/notification-bell-menu";

interface HeaderActionsProps {
  user: {
    id: string;
    name: string;
    role: Role;
    instituteId: string;
  };
}

/** Sticky header controls: notifications (student/admin), theme, account menu. */
export async function HeaderActions({ user }: HeaderActionsProps) {
  const showBell = roleHasNotificationInbox(user.role);

  const [unreadCount, recent] = showBell
    ? await Promise.all([
        getUnreadNotificationCount(user.id, user.instituteId),
        listRecentNotifications(user.id, user.instituteId),
      ])
    : [0, []];

  return (
    <div className="ml-auto flex items-center gap-2">
      {showBell && (
        <NotificationBellMenu
          role={user.role}
          unreadCount={unreadCount}
          recent={recent}
          pollIntervalMs={getNotificationPollIntervalMs()}
        />
      )}
      <ThemeToggle />
      <UserMenu user={user} />
    </div>
  );
}

/** Lightweight fallback while notification counts load. */
export function HeaderActionsFallback({
  user,
}: HeaderActionsProps) {
  return (
    <div className="ml-auto flex items-center gap-2">
      <ThemeToggle />
      <UserMenu user={user} />
    </div>
  );
}
