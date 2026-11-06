import {
  homeworkUploadStatus,
  finalizeHomeworkUpload,
  storeLocalHomeworkUpload,
} from "@/server/homework-uploads";
import {
  homeworkUploadStudent,
  requireUploadOrigin,
  smallUploadJson,
  uploadFailure,
  uploadJson,
} from "@/server/homework-upload-http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ uploadId: string }> };
export async function GET(_request: Request, context: Context) {
  const { uploadId } = await context.params;
  try {
    return uploadJson(
      await homeworkUploadStatus(await homeworkUploadStudent(), uploadId),
    );
  } catch (error) {
    return uploadFailure(error, "status", uploadId);
  }
}
/** Metadata only. Blob bytes NEVER pass through this finalization endpoint. */
export async function POST(request: Request, context: Context) {
  const { uploadId } = await context.params;
  try {
    requireUploadOrigin(request);
    await smallUploadJson(request);
    return uploadJson(
      await finalizeHomeworkUpload(await homeworkUploadStudent(), uploadId),
    );
  } catch (error) {
    return uploadFailure(error, "finalize", uploadId);
  }
}
/** Preserve private filesystem development without exposing a production upload fallback. */
export async function PUT(request: Request, context: Context) {
  if (process.env.NODE_ENV === "production")
    return new Response("Not found", { status: 404 });
  const { uploadId } = await context.params;
  try {
    requireUploadOrigin(request);
    await storeLocalHomeworkUpload(
      await homeworkUploadStudent(),
      uploadId,
      request,
    );
    return uploadJson({ ok: true });
  } catch (error) {
    return uploadFailure(error, "local-transfer", uploadId);
  }
}
