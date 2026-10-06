import { NextResponse } from "next/server";

import { verifyCronSecret } from "@/lib/cron-auth";
import { maintainHomework } from "@/server/homework";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json({ ok: true, stats: await maintainHomework() });
  } catch (error) {
    console.error("[cron/homework] failed", error);
    return NextResponse.json({ error: "Homework maintenance failed" }, { status: 500 });
  }
}
