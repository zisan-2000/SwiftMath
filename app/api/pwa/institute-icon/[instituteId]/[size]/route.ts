import { NextResponse } from "next/server";

import { generateInstitutePwaIcon } from "@/server/institute-pwa-icons";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ instituteId: string; size: string }>;
}

/**
 * Square PNG launcher icons derived from an institute logo.
 * Public — logos are already public; used by the dynamic web manifest.
 */
export async function GET(request: Request, { params }: RouteParams) {
  const { instituteId, size } = await params;
  const result = await generateInstitutePwaIcon(instituteId, size);

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.status === 400 ? "Invalid size" : "Not found" },
      { status: result.status },
    );
  }

  const ifNoneMatch = request.headers.get("if-none-match");
  if (ifNoneMatch === result.etag) {
    return new NextResponse(null, { status: 304 });
  }

  return new NextResponse(new Uint8Array(result.png), {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      ETag: result.etag,
    },
  });
}
