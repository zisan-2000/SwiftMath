import { NextResponse } from "next/server";

import { verifyCronSecret } from "@/lib/cron-auth";
import { purgeStaleNotifications } from "@/server/notification-retention";

export const dynamic = "force-dynamic";

/**
 * Daily cron entry point for notification retention (N8).
 * Secured with `CRON_SECRET` — see docs/DEPLOYMENT.md.
 */
export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const stats = await purgeStaleNotifications();
    return NextResponse.json({ ok: true, stats });
  } catch (error) {
    console.error("[cron/notifications-retention] failed", error);
    return NextResponse.json(
      { error: "Retention job failed" },
      { status: 500 },
    );
  }
}
