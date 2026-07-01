import { NextResponse } from "next/server";

import { verifyCronSecret } from "@/lib/cron-auth";
import { runScheduledExamNotificationCron } from "@/server/notification-cron";

export const dynamic = "force-dynamic";

/**
 * Vercel Cron (or manual ops) entry point for time-based exam notifications.
 * Secured with `CRON_SECRET` — see docs/DEPLOYMENT.md.
 */
export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const stats = await runScheduledExamNotificationCron();
    return NextResponse.json({ ok: true, stats });
  } catch (error) {
    console.error("[cron/notifications] failed", error);
    return NextResponse.json(
      { error: "Cron job failed" },
      { status: 500 },
    );
  }
}
