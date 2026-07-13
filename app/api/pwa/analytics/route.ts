import { NextResponse } from "next/server";

import {
  type PwaAnalyticsPayload,
  isPwaAnalyticsEvent,
} from "@/lib/pwa-analytics";

export const dynamic = "force-dynamic";

/** Accept lightweight PWA funnel events from the client (fire-and-forget). */
export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
  }

  const payload = body as Partial<PwaAnalyticsPayload>;
  if (!payload.event || !isPwaAnalyticsEvent(payload.event)) {
    return NextResponse.json({ ok: false, error: "Unknown event" }, { status: 400 });
  }

  const record = {
    event: payload.event,
    metadata:
      payload.metadata && typeof payload.metadata === "object"
        ? payload.metadata
        : undefined,
    ts: typeof payload.ts === "number" ? payload.ts : Date.now(),
  };

  // Structured log for Vercel/Railway log drains until a dedicated analytics sink ships.
  console.info("[pwa-analytics]", JSON.stringify(record));

  return NextResponse.json({ ok: true });
}
