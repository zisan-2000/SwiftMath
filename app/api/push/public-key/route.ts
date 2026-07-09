import { NextResponse } from "next/server";

import { getVapidPublicKey } from "@/server/web-push";

export const dynamic = "force-dynamic";

export async function GET() {
  const publicKey = getVapidPublicKey();
  return NextResponse.json({
    enabled: Boolean(publicKey),
    publicKey,
  });
}
