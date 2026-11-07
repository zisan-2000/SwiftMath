import { NextResponse } from "next/server";

import { requireUser } from "@/lib/session";
import { getHomeworkPhotoAccess } from "@/server/homework";
import { readHomeworkPhoto } from "@/server/homework-photos";
import { HomeworkUploadError } from "@/lib/homework-upload";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ submissionId: string; kind: string }> },
) {
  const user = await requireUser();
  const { submissionId, kind } = await params;
  if (kind !== "first" && kind !== "final")
    return new NextResponse("Not found", { status: 404 });
  const key = await getHomeworkPhotoAccess(user, submissionId, kind);
  if (!key) return new NextResponse("Not found", { status: 404 });
  let photo;
  try {
    photo = await readHomeworkPhoto(key);
  } catch (error) {
    if (
      error instanceof HomeworkUploadError &&
      error.code === "IMAGE_PROCESSOR_UNAVAILABLE"
    )
      return new NextResponse(error.message, {
        status: 503,
        headers: {
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
        },
      });
    throw error;
  }
  if (!photo) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(photo.body as BodyInit, {
    headers: {
      "Content-Type": photo.contentType,
      "Content-Disposition": "inline",
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
