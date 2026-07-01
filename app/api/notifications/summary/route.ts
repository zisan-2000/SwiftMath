import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/session";
import { roleHasNotificationInbox } from "@/lib/notifications";
import {
  getUnreadNotificationCount,
  listRecentNotifications,
} from "@/server/notifications";

export const dynamic = "force-dynamic";

/** Lightweight bell payload for client polling (N10). */
export async function GET() {
  const user = await getCurrentUser();
  if (!user || !roleHasNotificationInbox(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [unreadCount, recent] = await Promise.all([
    getUnreadNotificationCount(user.id, user.instituteId),
    listRecentNotifications(user.id, user.instituteId),
  ]);

  return NextResponse.json({ unreadCount, recent });
}
