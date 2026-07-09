import { NextResponse } from "next/server";

import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await requireUser();
  const body = await request.json().catch(() => null);
  const endpoint =
    typeof (body as { endpoint?: unknown } | null)?.endpoint === "string"
      ? (body as { endpoint: string }).endpoint
      : null;

  await prisma.pushSubscription.updateMany({
    where: {
      userId: user.id,
      ...(endpoint ? { endpoint } : {}),
      disabledAt: null,
    },
    data: { disabledAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
