import { NextResponse } from "next/server";

import { requireUser } from "@/lib/session";
import { roleHasNotificationInbox } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface PushSubscriptionBody {
  endpoint?: unknown;
  keys?: {
    p256dh?: unknown;
    auth?: unknown;
  };
}

function parseSubscription(input: unknown) {
  const body = input as PushSubscriptionBody;
  const endpoint = typeof body.endpoint === "string" ? body.endpoint : "";
  const p256dh = typeof body.keys?.p256dh === "string" ? body.keys.p256dh : "";
  const auth = typeof body.keys?.auth === "string" ? body.keys.auth : "";

  if (!endpoint || !p256dh || !auth) {
    return null;
  }

  return { endpoint, p256dh, auth };
}

export async function GET() {
  const user = await requireUser();
  if (!roleHasNotificationInbox(user.role)) {
    return NextResponse.json({ error: "Unsupported role" }, { status: 403 });
  }

  const count = await prisma.pushSubscription.count({
    where: { userId: user.id, disabledAt: null },
  });
  return NextResponse.json({ subscribed: count > 0, count });
}

export async function POST(request: Request) {
  const user = await requireUser();
  if (!roleHasNotificationInbox(user.role)) {
    return NextResponse.json({ error: "Unsupported role" }, { status: 403 });
  }

  const subscription = parseSubscription(await request.json().catch(() => null));
  if (!subscription) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint: subscription.endpoint },
    create: {
      userId: user.id,
      instituteId: user.instituteId,
      endpoint: subscription.endpoint,
      p256dh: subscription.p256dh,
      auth: subscription.auth,
      userAgent: request.headers.get("user-agent"),
    },
    update: {
      userId: user.id,
      instituteId: user.instituteId,
      p256dh: subscription.p256dh,
      auth: subscription.auth,
      userAgent: request.headers.get("user-agent"),
      disabledAt: null,
      lastFailedAt: null,
    },
  });

  return NextResponse.json({ ok: true });
}
