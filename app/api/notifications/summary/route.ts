import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/session";
import { roleHasNotificationInbox } from "@/lib/notifications";
import { getNotificationSummaryPayload } from "@/server/notification-summary";

export const dynamic = "force-dynamic";

/** Lightweight bell + nav badge payload for client polling (N10). */
export async function GET() {
  const user = await getCurrentUser();
  if (!user || !roleHasNotificationInbox(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(await getNotificationSummaryPayload(user));
}
